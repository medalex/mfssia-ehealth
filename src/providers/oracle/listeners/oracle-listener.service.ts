import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import rawAbi from '../abi/MfssiaOracleConsumer.json';
import { PendingVerificationService } from '@/modules/pending-verification/pending-verification.service';
import { AttestationService } from '@/modules/mfssia-attestation/mfssia-attestation.service';
import { DkgService } from '@/providers/dkg/dkg.service';
import { PendingVerificationStatus } from '@/modules/pending-verification/pending-verification.enums';
import { Uuid } from '@/common/types/common.type';
import { GlobalConfig } from '@/config/config.type';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OracleEvent } from '@/shared/realtime/events/oracle.event';
import { OraclePoll } from '@/constants/oracle.constant';
import { sleep, withTimeout } from '@/shared/utils/sleep';

@Injectable()
export class OracleListenerService implements OnModuleInit {
  private readonly logger = new Logger(OracleListenerService.name);

  private provider!: ethers.JsonRpcProvider;
  private contract!: ethers.Contract;

  private lastBlock = 0;
  private lastProgressAt = Date.now();
  private shuttingDown = false;

  private readonly abi = rawAbi.abi;
  private readonly rpcUrl: string;
  private readonly consumerAddress: string;

  constructor(
    private readonly config: ConfigService<GlobalConfig, true>,
    private readonly pendingVerificationService: PendingVerificationService,
    private readonly attestationService: AttestationService,
    private readonly dkgService: DkgService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const { rpcUrl, consumerAddress } = this.config.get('blockchain', {
      infer: true,
    });

    this.rpcUrl = rpcUrl;
    this.consumerAddress = consumerAddress;

    this.createProvider();
  }

  onModuleInit() {
    void this.bootstrap();
    this.startWatchdog();
  }

  // ──────────────────────────────────────────────

  private async bootstrap() {
    const head = await withTimeout(this.provider.getBlockNumber());
    this.lastBlock = Math.max(0, head - OraclePoll.cSTARTUP_REWIND_BLOCKS);

    this.logger.log(`Oracle listener starting at block ${this.lastBlock}`);

    void this.pollLoop();
  }

  private createProvider() {
    this.logger.warn('Creating RPC provider');

    try {
      this.provider?.destroy?.();
    } catch {}

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.contract = new ethers.Contract(
      this.consumerAddress,
      this.abi,
      this.provider,
    );
  }

  // ──────────────────────────────────────────────

  private async pollLoop() {
    while (!this.shuttingDown) {
      const loopStart = Date.now();

      try {
        await this.pollOnce();
        this.lastProgressAt = Date.now();
      } catch (err: any) {
        this.logger.error(
          `Polling iteration failed: ${err.message}`,
          err.stack,
        );

        if (err.message.includes('timeout')) {
          this.createProvider();
        }
      }

      const elapsed = Date.now() - loopStart;
      await sleep(Math.max(0, OraclePoll.POLL_INTERVAL_MS - elapsed));
    }
  }

  private async pollOnce() {
    const head = await withTimeout(this.provider.getBlockNumber());
    const safeBlock = head - OraclePoll.CONFIRMATIONS;

    if (safeBlock <= this.lastBlock) {
      return;
    }

    const fromBlock = this.lastBlock + 1;
    const toBlock = safeBlock;

    this.logger.debug(`Polling blocks ${fromBlock} → ${toBlock}`);

    const events = await withTimeout(
      this.contract.queryFilter(
        this.contract.filters.VerificationResponseReceived(),
        fromBlock,
        toBlock,
      ),
    );

    for (const ev of events as any[]) {
      await this.processEvent(ev);
    }

    this.lastBlock = toBlock;
  }

  // ──────────────────────────────────────────────

  private async processEvent(ev: any) {
    const args = ev.args;
    if (!args) return;

    const [requestId, , response, err] = args;
    const requestIdStr = requestId.toString();

    const pending = await this.pendingVerificationService.findByRequestId(
      requestIdStr,
    );

    if (!pending) {
      this.logger.warn(`No pending verification for ${requestIdStr}`);
      return;
    }

    try {
      const parsed = this.safeParseOracleResponse(response, err);

      if (parsed.finalResult === 'PASS') {
        await this.handleVerificationSuccess(pending, requestIdStr, parsed);
      } else {
        await this.handleVerificationFailure(pending, requestIdStr, parsed);
      }
    } catch (error: any) {
      await this.handleProcessingError(pending, requestIdStr, error);
    }
  }

  // ──────────────────────────────────────────────
  // 🐶 Watchdog

  private startWatchdog() {
    setInterval(() => {
      const stalledFor = Date.now() - this.lastProgressAt;

      if (stalledFor > OraclePoll.STALL_TIMEOUT_MS) {
        this.logger.error(
          `Listener stalled for ${stalledFor}ms — resetting provider`,
        );
        this.createProvider();
        this.lastProgressAt = Date.now();
      }
    }, 30_000);
  }

  private safeParseOracleResponse(response: string, err: string) {
    let resultStr = '';
    let hasError = false;

    if (err && err.length > 2) {
      hasError = true;
      try {
        resultStr = ethers.toUtf8String(err);
      } catch {
        resultStr = '[Non-UTF8 error bytes]';
      }
      this.logger.error(`Oracle execution error: ${resultStr}`);
    } else if (response && response.length > 2) {
      try {
        resultStr = ethers.toUtf8String(response);
      } catch {
        hasError = true;
        resultStr = '[Invalid response data]';
        this.logger.warn('Response contains invalid UTF-8 bytes');
      }
    } else {
      hasError = true;
      resultStr = '[Empty response]';
      this.logger.error('Empty oracle response');
    }

    if (hasError) throw new Error(resultStr || 'Invalid oracle response');

    let parsed: any;
    try {
      parsed = JSON.parse(resultStr);
    } catch {
      throw new Error('Invalid JSON from oracle response');
    }

    const maskHex = parsed.m ?? '0x0';
    const passedChallenges = this.decodeBitmask(maskHex);

    this.logger.verbose('Parsed' + JSON.stringify(parsed));
    this.logger.verbose('resultStr' + resultStr);

    return {
      finalResult: parsed.r === 1 ? 'PASS' : 'FAIL',
      aggregateConfidence: (parsed.c ?? 0) / 10000,
      rawResponse: resultStr,
      passedChallenges,
    };
  }

  private decodeBitmask(maskHex: string): string[] {
    const CHALLENGE_INDEX: Record<string, number> = {
      'mfssia:C-A-1': 0,
      'mfssia:C-A-2': 1,
      'mfssia:C-A-3': 2,
      'mfssia:C-A-4': 3,
      'mfssia:C-A-5': 4,
      'mfssia:C-A-6': 5,
      'mfssia:C-B-1': 6,
      'mfssia:C-B-2': 7,
      'mfssia:C-B-3': 8,
      'mfssia:C-B-4': 9,
      'mfssia:C-B-5': 10,
      'mfssia:C-B-6': 11,
      'mfssia:C-B-7': 12,
      'mfssia:C-B-8': 13,
      'mfssia:C-B-9': 14,
      'mfssia:C-C-1': 15,
      'mfssia:C-C-2': 16,
      'mfssia:C-C-3': 17,
      'mfssia:C-C-4': 18,
      'mfssia:C-C-5': 19,
      'mfssia:C-C-6': 20,
      'mfssia:C-C-7': 21,
      'mfssia:C-C-8': 22,
      'mfssia:C-C-9': 23,
      'mfssia:C-C-10': 24,
      'mfssia:C-D-1': 25,
      'mfssia:C-D-2': 26,
      'mfssia:C-D-3': 27,
      'mfssia:C-D-4': 28,
      'mfssia:C-D-5': 29,
      'mfssia:C-D-6': 30,
      'mfssia:C-D-7': 31,
      'mfssia:C-D-8': 32,
      'mfssia:C-D-9': 33,
    };

    const passed: string[] = [];
    const mask = BigInt(maskHex);

    for (const [id, index] of Object.entries(CHALLENGE_INDEX)) {
      if ((mask & (1n << BigInt(index))) !== 0n) {
        passed.push(id);
      }
    }
    return passed;
  }

  private async handleVerificationSuccess(
    pending: any,
    requestId: string,
    result: any,
  ) {
    this.logger.log(`Verification PASSED — creating attestation`);
    await this.attestationService.createFromInstance(
      pending.instanceId as Uuid,
      requestId,
      result.passedChallenges,
    );

    this.eventEmitter.emit(OracleEvent.VERIFICATION_SUCCESS, {
      instanceId: pending.instanceId,
      requestId,
      result,
    });

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.SUCCESS,
      rawResponse: JSON.stringify(result),
    });

    this.logger.log(
      `Attestation & backend update complete — instance=${pending.instanceId}`,
    );
  }

  private async handleVerificationFailure(
    pending: any,
    requestId: string,
    result: any,
  ) {
    this.logger.warn(
      `Verification FAILED — passed challenges: ${result.passedChallenges.join(
        ', ',
      )}`,
    );

    this.eventEmitter.emit(OracleEvent.VERIFICATION_FAILED, {
      instanceId: pending.instanceId,
      requestId,
      result,
    });

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.FAILED,
      rawResponse: JSON.stringify(result),
    });
  }

  private async handleProcessingError(
    pending: any,
    requestId: string,
    error: any,
  ) {
    this.logger.error(`Processing failed: ${error.message}`, error.stack);

    this.eventEmitter.emit(OracleEvent.VERIFICATION_ERROR, {
      instanceId: pending.instanceId,
      requestId,
      error: error.message,
    });

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.ERROR,
      errorMessage: error.message,
    });
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import rawAbi from '../abi/MfssiaOracleConsumer.json';
import { PendingVerificationService } from '@/modules/pending-verification/pending-verification.service';
import { AttestationService } from '@/modules/mfssia-attestation/mfssia-attestation.service';
import { DkgService } from '@/providers/dkg/dkg.service';
import { PendingVerification } from '@/modules/pending-verification/entities/pending-verification.entity';
import { PendingVerificationStatus } from '@/modules/pending-verification/pending-verification.enums';
import { Uuid } from '@/common/types/common.type';
import { GlobalConfig } from '@/config/config.type';

@Injectable()
export class OracleListenerService implements OnModuleInit {
  private readonly logger = new Logger(OracleListenerService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private readonly MfssiaOracleConsumerABI = rawAbi.abi;

  constructor(
    private config: ConfigService<GlobalConfig, true>,
    private pendingVerificationService: PendingVerificationService,
    private attestationService: AttestationService,
    private dkgService: DkgService,
  ) {
    const blockchain = this.config.get('blockchain', { infer: true });
    this.provider = new ethers.JsonRpcProvider(blockchain.rpcUrl);
    this.contract = new ethers.Contract(
      blockchain.consumerAddress,
      this.MfssiaOracleConsumerABI,
      this.provider,
    );
  }

  onModuleInit(): void {
    this.startListening();
  }

  private startListening(): void {
    this.logger.log('Starting Chainlink Functions listener (real-time)');

    void this.contract.on(
      'VerificationResponseReceived',
      async (requestId, instanceKey, response, err) => {
        const requestIdStr = requestId.toString();
        this.logger.log(`Response received — requestId=${requestIdStr}`);

        const pending = await this.pendingVerificationService.findByRequestId(
          requestIdStr,
        );
        if (!pending) {
          this.logger.warn(`No pending record for requestId=${requestIdStr}`);
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
      },
    );

    this.logger.log('Direct listener active');
  }

  /**
   * Safely parse oracle response JSON & decode challenge bitmask
   */
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

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(resultStr);
    } catch {
      throw new Error('Invalid JSON from oracle response');
    }

    // Extract finalResult, confidence, and decode bitmask
    const maskHex = parsed.m ?? '0x0';
    const passedChallenges = this.decodeBitmask(maskHex);

    return {
      finalResult: parsed.r === 1 ? 'PASS' : 'FAIL',
      aggregateConfidence: (parsed.c ?? 0) / 10000,
      rawResponse: resultStr,
      passedChallenges,
    };
  }

  /**
   * Decode challenge bitmask into array of challenge IDs
   */
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
    pending: PendingVerification,
    requestId: string,
    result: any,
  ) {
    this.logger.log(`Verification PASSED — creating attestation`);
    await this.attestationService.createFromInstance(
      pending.instanceId as Uuid,
      requestId,
      result.passedChallenges,
    );

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.SUCCESS,
      rawResponse: JSON.stringify(result),
    });

    this.notifyFrontend(pending.instanceId, result);
    this.logger.log(
      `Attestation & backend update complete — instance=${pending.instanceId}`,
    );
  }

  private async handleVerificationFailure(
    pending: PendingVerification,
    requestId: string,
    result: any,
  ) {
    this.logger.warn(
      `Verification FAILED — passed challenges: ${result.passedChallenges.join(
        ', ',
      )}`,
    );

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.FAILED,
      rawResponse: JSON.stringify(result),
    });

    this.notifyFrontend(pending.instanceId, result);
  }

  private async handleProcessingError(
    pending: PendingVerification,
    requestId: string,
    error: any,
  ) {
    this.logger.error(`Processing failed: ${error.message}`, error.stack);

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.ERROR,
      errorMessage: error.message,
    });

    this.notifyFrontend(pending.instanceId, {
      status: 'ERROR',
      message: error.message || 'Internal processing error',
    });
  }

  private notifyFrontend(instanceId: string, payload: any): void {
    this.logger.verbose(`Notifying frontend — instance=${instanceId}`);
    console.log('Frontend update:', { instanceId, payload });
  }
}

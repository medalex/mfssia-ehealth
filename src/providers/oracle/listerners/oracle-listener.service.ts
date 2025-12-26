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
    this.logger.log('Starting Chainlink Functions direct listener (fast path)');

    // Fast path: direct real-time listener with void to satisfy ESLint
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

        this.logger.log(
          `Processing response for instance=${pending.instanceId}`,
        );

        try {
          const result = this.safeParseOracleResponse(response, err);

          if (result.finalResult === 'PASS') {
            await this.handleVerificationSuccess(pending, requestIdStr, result);
          } else {
            await this.handleVerificationFailure(pending, requestIdStr, result);
          }
        } catch (error: any) {
          await this.handleProcessingError(pending, requestIdStr, error);
        }
      },
    );

    this.logger.log('Direct listener active');
  }

  /**
   * Safely decode and parse oracle response — handles invalid UTF-8 gracefully
   */
  private safeParseOracleResponse(response: string, err: string): any {
    let resultStr = '';
    let hasError = false;

    // Check for oracle error first
    if (err && err.length > 2) {
      // > 2 to ignore '0x'
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
        this.logger.warn('Response contains invalid UTF-8 bytes');
        hasError = true;
        resultStr = '[Invalid response data]';
      }
    } else {
      hasError = true;
      resultStr = '[Empty response]';
      this.logger.error('Empty oracle response');
    }

    if (hasError) {
      throw new Error(resultStr || 'Invalid or empty response');
    }

    try {
      const parsed = JSON.parse(resultStr);
      this.logger.verbose(`Parsed JSON response successfully`);
      return parsed;
    } catch (parseError) {
      this.logger.error(
        `Failed to parse response as JSON: ${resultStr.substring(0, 200)}...`,
      );
      throw new Error('Invalid JSON from oracle');
    }
  }

  private async handleVerificationSuccess(
    pending: PendingVerification,
    requestId: string,
    result: any,
  ): Promise<void> {
    this.logger.log(`Verification PASSED — creating attestation`);

    await this.attestationService.createFromInstance(
      pending.instanceId as Uuid,
      requestId,
      result.passedChallenges,
    );

    this.notifyFrontend(pending.instanceId, {
      status: PendingVerificationStatus.SUCCESS,
      passedChallenges: result.passedChallenges,
      confidence: result.aggregateConfidence,
    });

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.SUCCESS,
      rawResponse: JSON.stringify(result),
    });

    this.logger.log(
      `Attestation flow completed for instance=${pending.instanceId}`,
    );
  }

  private async handleVerificationFailure(
    pending: PendingVerification,
    requestId: string,
    result: any,
  ): Promise<void> {
    this.logger.warn(`Verification FAILED`);

    this.notifyFrontend(pending.instanceId, {
      status: PendingVerificationStatus.FAILED,
      details: result.details || 'Policy not satisfied',
    });

    await this.pendingVerificationService.updateByRequestId(requestId, {
      status: PendingVerificationStatus.FAILED,
      rawResponse: JSON.stringify(result),
    });
  }

  private async handleProcessingError(
    pending: PendingVerification,
    requestId: string,
    error: any,
  ): Promise<void> {
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
    // Replace with your actual WebSocket emit if injected
    console.log('Frontend update:', { instanceId, payload });
  }
}

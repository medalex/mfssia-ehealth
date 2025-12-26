import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ChallengeSetService } from '@/modules/challenge-set/challenge-set.service';
import { ChallengeInstanceService } from '@/modules/challenge-instance/challenge-instance.service';
import { Uuid } from '@/common/types/common.type';
import { PendingVerificationRepository } from '@/modules/pending-verification/pending-verification.repository';
import rawAbi from './abi/MfssiaOracleConsumer.json';
import { PendingVerificationStatus } from '@/modules/pending-verification/pending-verification.enums';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private readonly MfssiaOracleConsumerABI = rawAbi.abi;

  constructor(
    private config: ConfigService,
    private challengeInstanceService: ChallengeInstanceService,
    private challengeSetService: ChallengeSetService,
    private pendingRepo: PendingVerificationRepository,
  ) {
    this.provider = new ethers.JsonRpcProvider(
      this.config.get('blockchain.rpcUrl'),
    );
    this.signer = new ethers.Wallet(
      this.config.get('blockchain.privateKey'),
      this.provider,
    );
    this.contract = new ethers.Contract(
      this.config.get('oracle.consumerAddress'),
      this.MfssiaOracleConsumerABI,
      this.signer,
    );
  }

  /**
   * Trigger batch verification — called when all mandatory evidence is collected
   */
  async triggerBatchVerification(
    instanceId: Uuid,
    subjectDid: string,
  ): Promise<string> {
    this.logger.log(
      `🔍 Starting batch verification — instanceId=${instanceId}, subjectDid=${subjectDid}`,
    );

    // Load instance with evidences
    const instance = await this.challengeInstanceService.findOne(instanceId);
    this.logger.verbose(
      `Instance loaded — ${instance.evidences.length} evidence(s) attached`,
    );

    // Load challenge set
    const challengeSet = await this.challengeSetService.findOne(
      instance.challengeSet,
    );
    if (!challengeSet) {
      this.logger.error(`Challenge set not found: ${instance.challengeSet}`);
      throw new BadRequestException(
        `Challenge set ${instance.challengeSet} not found`,
      );
    }

    this.logger.verbose(
      `Challenge set: ${challengeSet.code} (v${challengeSet.version})`,
    );
    this.logger.verbose(
      `Policy → rule: ${challengeSet.policy.aggregationRule}, threshold: ${
        challengeSet.policy.confidenceThreshold ?? 'none'
      }, minRequired: ${challengeSet.policy.minChallengesRequired}`,
    );

    // Build evidences map
    const evidencesMap: Record<string, any> = {};
    instance.evidences.forEach((e) => {
      evidencesMap[e.challengeId] = e.evidence;
      this.logger.debug(
        `Evidence [${e.challengeId}]: ${JSON.stringify(e.evidence).substring(
          0,
          150,
        )}...`,
      );
    });

    const submittedCount = Object.keys(evidencesMap).length;
    this.logger.log(
      `📤 Submitting ${submittedCount} evidence(s) to Chainlink Functions oracle`,
    );

    // Prepare args
    const args = [
      JSON.stringify(evidencesMap),
      JSON.stringify(challengeSet.mandatoryChallenges),
      JSON.stringify(challengeSet.optionalChallenges || []),
      challengeSet.policy.aggregationRule,
      challengeSet.policy.confidenceThreshold?.toString() || 'null',
      challengeSet.policy.minChallengesRequired.toString(),
    ];

    this.logger.debug(`Oracle args ready — ${args.length} arguments prepared`);

    // Generate instance key
    const instanceKey = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string'],
        [subjectDid, instanceId],
      ),
    );
    this.logger.verbose(`Instance key generated: ${instanceKey}`);

    try {
      this.logger.log(`⛓️ Sending requestVerification transaction...`);

      const tx = await this.contract.requestVerification(
        instanceKey,
        challengeSet.code,
        args,
        this.config.get('chainlink.subscriptionId'),
        600000,
      );

      this.logger.verbose(`Transaction submitted — hash: ${tx.hash}`);
      const receipt = await tx.wait();

      this.logger.log(
        `✅ Transaction confirmed — block: ${receipt.blockNumber}, gasUsed: ${receipt.gasUsed}`,
      );

      // Extract requestId
      const eventLog = receipt.logs.find((log: any) => {
        try {
          return (
            this.contract.interface.parseLog(log).name ===
            'VerificationRequested'
          );
        } catch {
          return false;
        }
      });

      if (!eventLog) {
        this.logger.error('VerificationRequested event missing in receipt');
        throw new Error('Failed to extract oracle requestId');
      }

      const parsedEvent = this.contract.interface.parseLog(eventLog);
      const requestId = parsedEvent.args.requestId;

      this.logger.log(`🎯 Oracle request submitted — requestId=${requestId}`);

      // Save pending record
      await this.pendingRepo.save({
        requestId: requestId.toString(),
        instanceId,
        subjectDid,
        challengeSetCode: challengeSet.code,
        status: PendingVerificationStatus.PENDING,
        requestedAt: new Date(),
        txHash: tx.hash,
      });

      this.logger.log(`📝 Pending verification record saved`);

      return requestId.toString();
    } catch (error: any) {
      this.logger.error(
        `❌ Verification trigger failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

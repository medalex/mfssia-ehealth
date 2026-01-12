import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { ChallengeInstanceService } from '../challenge-instance/challenge-instance.service';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { OracleVerificationService } from '@/providers/oracle/oracle-verification.service';
import { InstanceState } from '@/common/enums/instance-state.enum';

@Injectable()
export class ChallengeEvidenceService {
  private readonly logger = new Logger(ChallengeEvidenceService.name);

  constructor(
    @InjectRepository(ChallengeEvidence)
    private readonly evidenceRepo: Repository<ChallengeEvidence>,
    private readonly instanceService: ChallengeInstanceService,
    private readonly challengeSetService: ChallengeSetService,
    private readonly oracleVerificationService: OracleVerificationService,
  ) {}

  /**
   * Submit evidence for a specific challenge instance
   */
  async submit(dto: SubmitEvidenceDto): Promise<ChallengeEvidence> {
    this.logger.log(
      `Submitting evidence for challenge ${dto.challengeId} in instance ${dto.challengeInstanceId}`,
    );

    // Load instance with relations
    const instance = await this.instanceService.findOneWithRelations(
      dto.challengeInstanceId,
    );

    // Validate instance state
    if (instance.state !== InstanceState.IN_PROGRESS) {
      throw new BadRequestException(
        `Challenge instance is not in progress (current state: ${instance.state})`,
      );
    }

    // Prevent duplicate evidence for the same challenge
    if (instance.evidences.some((e) => e.challengeId === dto.challengeId)) {
      throw new BadRequestException(
        `Evidence for challenge ${dto.challengeId} already submitted`,
      );
    }

    // Save new evidence
    const evidence = this.evidenceRepo.create({
      challengeId: dto.challengeId,
      evidence: dto.evidence,
      challengeInstance: instance,
    });

    const savedEvidence = await this.evidenceRepo.save(evidence);
    this.logger.log(`Evidence saved for challenge ${dto.challengeId}`);

    // Check if all mandatory evidence is submitted and trigger oracle
    await this.checkAndTriggerOracleVerification(instance);

    return savedEvidence;
  }

  /**
   * Check mandatory evidence and trigger oracle verification
   */
  private async checkAndTriggerOracleVerification(
    instance: any,
  ): Promise<void> {
    const challengeSet = await this.challengeSetService.findById(
      instance.challengeSet,
    );

    if (!challengeSet) {
      this.logger.warn(
        `Challenge set ${instance.challengeSet} not found — skipping oracle trigger`,
      );
      return;
    }

    const mandatoryChallengeIds = challengeSet.mandatoryChallenges || [];
    if (mandatoryChallengeIds.length === 0) {
      this.logger.verbose('No mandatory challenges — skipping verification');
      return;
    }

    // Determine submitted mandatory challenges
    const submittedMandatoryIds = instance.evidences
      .filter((e: any) => mandatoryChallengeIds.includes(e.challengeId))
      .map((e: any) => e.challengeId);

    const allMandatorySubmitted = mandatoryChallengeIds.every((id) =>
      submittedMandatoryIds.includes(id),
    );

    // Use state instead of pendingVerification
    const isVerificationInProgress =
      instance.state === InstanceState.VERIFICATION_IN_PROGRESS;

    if (allMandatorySubmitted && !isVerificationInProgress) {
      this.logger.log(
        `All mandatory evidence collected for instance ${instance.id} — triggering oracle verification`,
      );

      try {
        const requestId =
          await this.oracleVerificationService.triggerBatchVerification(
            instance.id,
            instance.identity.identifier, // identity DID
          );

        this.logger.log(
          `Oracle verification triggered successfully — requestId: ${requestId}`,
        );

        // Update instance state
        instance.state = InstanceState.VERIFICATION_IN_PROGRESS;
        await this.instanceService.update(instance.id, {
          state: instance.state,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to trigger oracle verification: ${error.message}`,
          error.stack,
        );
      }
    } else if (!allMandatorySubmitted) {
      const missing = this.getMissingMandatoryChallenges(
        instance,
        mandatoryChallengeIds,
      );
      this.logger.verbose(
        `Waiting for ${
          missing.length
        } more mandatory evidence(s): ${missing.join(', ')}`,
      );
    } else if (isVerificationInProgress) {
      this.logger.verbose(
        `Oracle verification already in progress for instance ${instance.id}`,
      );
    }
  }

  /**
   * Helper: get missing mandatory challenges
   */
  private getMissingMandatoryChallenges(
    instance: any,
    mandatoryChallengeIds: string[],
  ): string[] {
    const submittedIds = instance.evidences.map((e: any) => e.challengeId);
    return mandatoryChallengeIds.filter((id) => !submittedIds.includes(id));
  }
}

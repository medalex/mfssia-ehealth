// src/modules/challenge-evidence/challenge-evidence.service.ts
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
   * Submit evidence for a specific challenge within an instance
   * Triggers oracle batch verification when all mandatory evidence is complete
   */
  async submit(dto: SubmitEvidenceDto): Promise<ChallengeEvidence> {
    this.logger.log(
      `Submitting evidence for challenge ${dto.challengeId} in instance ${dto.challengeInstanceId}`,
    );

    // 1. Load instance with relations
    const instance = await this.instanceService.findOneWithRelations(
      dto.challengeInstanceId,
    );

    // 2. Validate state
    if (instance.state !== InstanceState.IN_PROGRESS) {
      throw new BadRequestException(
        `Challenge instance is not in progress (current: ${instance.state})`,
      );
    }

    // 3. Prevent duplicate submission
    const existing = instance.evidences.find(
      (e) => e.challengeId === dto.challengeId,
    );
    if (existing) {
      throw new BadRequestException(
        `Evidence for challenge ${dto.challengeId} already submitted`,
      );
    }

    // 4. Save evidence
    const evidence = this.evidenceRepo.create({
      challengeId: dto.challengeId,
      evidence: dto.evidence,
      challengeInstance: instance,
    });

    const savedEvidence = await this.evidenceRepo.save(evidence);
    this.logger.log(`Evidence saved for ${dto.challengeId}`);

    // 5. Check if all mandatory evidence is now complete
    await this.checkAndTriggerOracleVerification(instance);

    return savedEvidence;
  }

  /**
   * Check if all mandatory challenges have evidence and trigger oracle if ready
   */
  private async checkAndTriggerOracleVerification(
    instance: any,
  ): Promise<void> {
    const challengeSet = await this.challengeSetService.findOne(
      instance.challengeSet,
    );
    if (!challengeSet) {
      this.logger.warn(
        `Challenge set ${instance.challengeSet} not found — skipping oracle trigger`,
      );
      return;
    }

    const mandatoryChallengeIds = challengeSet.mandatoryChallenges;
    if (mandatoryChallengeIds.length === 0) {
      this.logger.verbose('No mandatory challenges — nothing to verify');
      return;
    }

    // Count how many mandatory challenges have submitted evidence
    const submittedMandatoryIds = instance.evidences
      .filter((e: any) => mandatoryChallengeIds.includes(e.challengeId))
      .map((e: any) => e.challengeId);

    const allMandatorySubmitted = mandatoryChallengeIds.every((id) =>
      submittedMandatoryIds.includes(id),
    );

    // Prevent double-triggering
    const hasPendingVerification = instance.pendingVerification !== null;

    if (allMandatorySubmitted && !hasPendingVerification) {
      this.logger.log(
        `All mandatory evidence collected for instance ${instance.id} — triggering oracle verification`,
      );

      try {
        const requestId =
          await this.oracleVerificationService.triggerBatchVerification(
            instance.id,
            instance.subjectDid, // assuming you store this on the instance
          );

        this.logger.log(
          `Oracle verification triggered successfully — requestId: ${requestId}`,
        );

        // Optional: update instance status
        instance.status = InstanceState.VERIFICATION_IN_PROGRESS;
        await this.instanceService.update(instance.id, {
          state: instance.status,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to trigger oracle verification: ${error.message}`,
          error.stack,
        );
        // Don't throw — evidence was saved successfully; oracle can be retried later
      }
    } else if (!allMandatorySubmitted) {
      const missing = mandatoryChallengeIds.filter(
        (id) => !submittedMandatoryIds.includes(id),
      );
      this.logger.verbose(
        `Waiting for ${
          missing.length
        } more mandatory evidence(s): ${missing.join(', ')}`,
      );
    } else if (hasPendingVerification) {
      this.logger.verbose(
        `Oracle verification already in progress for instance ${instance.id}`,
      );
    }
  }
}

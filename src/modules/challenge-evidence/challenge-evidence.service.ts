import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { ChallengeInstanceService } from '../challenge-instance/challenge-instance.service';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { OracleVerificationService } from '@/providers/oracle/oracle-verification.service';
import { InstanceState } from '@/common/enums/instance-state.enum';
import { SubmitEvidenceBatchDto } from './dto/submit-evidence.dto';

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
   * Submit ALL evidence for a challenge instance (atomic batch)
   */
  async submitBatch(dto: SubmitEvidenceBatchDto): Promise<ChallengeEvidence[]> {
    this.logger.log(
      `Submitting evidence batch for instance ${dto.challengeInstanceId}`,
    );

    const instance = await this.instanceService.findOneWithRelations(
      dto.challengeInstanceId,
    );

    // 🔒 Validate instance state
    if (instance.state !== InstanceState.IN_PROGRESS) {
      throw new BadRequestException(
        `Challenge instance is not in progress (current state: ${instance.state})`,
      );
    }

    // 🔒 Prevent resubmission
    if (instance.evidences?.length > 0) {
      throw new BadRequestException(
        'Evidence already submitted for this challenge instance',
      );
    }

    const challengeSet = await this.challengeSetService.findOne(
      instance.challengeSet,
    );

    if (!challengeSet) {
      throw new BadRequestException(
        `Challenge set ${instance.challengeSet} not found`,
      );
    }

    const mandatoryChallengeIds = challengeSet.mandatoryChallenges ?? [];
    const optionalChallengeIds = challengeSet.optionalChallenges ?? [];

    const allowedChallengeIds = [
      ...mandatoryChallengeIds,
      ...optionalChallengeIds,
    ];

    const submittedChallengeIds = dto.responses.map((r) => r.challengeId);

    // 🔒 Validate mandatory coverage
    const missingMandatory = mandatoryChallengeIds.filter(
      (id) => !submittedChallengeIds.includes(id),
    );

    if (missingMandatory.length > 0) {
      throw new BadRequestException(
        `Missing mandatory evidence for challenges: ${missingMandatory.join(
          ', ',
        )}`,
      );
    }

    // 🔒 Validate no duplicates
    const duplicates = submittedChallengeIds.filter(
      (id, idx) => submittedChallengeIds.indexOf(id) !== idx,
    );

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate evidence submitted for challenges: ${[
          ...new Set(duplicates),
        ].join(', ')}`,
      );
    }

    // 🔒 Validate challenge IDs belong to set
    const invalidChallenges = submittedChallengeIds.filter(
      (id) => !allowedChallengeIds.includes(id),
    );

    if (invalidChallenges.length > 0) {
      throw new BadRequestException(
        `Invalid challenge IDs for this set: ${invalidChallenges.join(', ')}`,
      );
    }

    // ✅ Persist all evidence atomically
    const evidenceEntities = dto.responses.map((r) =>
      this.evidenceRepo.create({
        challengeId: r.challengeId,
        evidence: r.evidence,
        challengeInstance: instance,
      }),
    );

    const savedEvidence = await this.evidenceRepo.save(evidenceEntities);

    this.logger.log(
      `Saved ${savedEvidence.length} evidence records for instance ${instance.id}`,
    );

    // 🔁 Trigger oracle verification (once)
    await this.triggerOracleVerification(instance);

    return savedEvidence;
  }

  /**
   * Trigger oracle verification exactly once
   */
  private async triggerOracleVerification(instance: any): Promise<void> {
    if (instance.state === InstanceState.VERIFICATION_IN_PROGRESS) {
      this.logger.verbose(
        `Oracle verification already in progress for instance ${instance.id}`,
      );
      return;
    }

    try {
      const requestId =
        await this.oracleVerificationService.triggerBatchVerification(
          instance.id,
          instance.identity.identifier, // DID
        );

      this.logger.log(
        `Oracle verification triggered — requestId: ${requestId}`,
      );

      await this.instanceService.update(instance.id, {
        state: InstanceState.VERIFICATION_IN_PROGRESS,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger oracle verification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

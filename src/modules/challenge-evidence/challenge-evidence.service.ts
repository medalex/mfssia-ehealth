import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { ChallengeInstanceService } from '../challenge-instance/challenge-instance.service';

@Injectable()
export class ChallengeEvidenceService {
  constructor(
    @InjectRepository(ChallengeEvidence)
    private readonly repo: Repository<ChallengeEvidence>,
    private readonly instanceService: ChallengeInstanceService,
  ) {}

  async submit(dto: SubmitEvidenceDto): Promise<ChallengeEvidence> {
    const instance = await this.instanceService.findOne(
      dto.challengeInstanceId,
    );

    if (instance.state !== 'IN_PROGRESS') {
      throw new BadRequestException('Challenge instance is not in progress');
    }

    // Prevent duplicate submission for same challenge
    const existing = instance.evidences?.find(
      (e) => e.challengeId === dto.challengeId,
    );
    if (existing) {
      throw new BadRequestException(
        `Evidence for ${dto.challengeId} already submitted`,
      );
    }

    const evidence = this.repo.create({
      challengeId: dto.challengeId,
      evidence: dto.evidence,
      challengeInstance: instance,
    });

    return this.repo.save(evidence);
  }
}

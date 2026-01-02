// src/modules/challenge-instance/challenge-instance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeInstance } from './entities/challenge-instance.entity';
import { CreateChallengeInstanceDto } from './dto/create-challenge-instance.dto';
import * as crypto from 'crypto';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { IdentityService } from '../mfssia-identity/mfssia-identity.service';
import { InstanceState } from '@/common/enums/instance-state.enum';
import { Uuid } from '@/common/types/common.type';

@Injectable()
export class ChallengeInstanceService {
  constructor(
    @InjectRepository(ChallengeInstance)
    private readonly repo: Repository<ChallengeInstance>,
    private readonly identityService: IdentityService,
    private readonly setService: ChallengeSetService,
  ) {}

  async create(dto: CreateChallengeInstanceDto): Promise<ChallengeInstance> {
    const identity = await this.identityService.findByDid(dto.did);
    const challengeSet = await this.setService.findOne(dto.challengeSet);

    const nonce = crypto.randomBytes(16).toString('hex');

    const instance = this.repo.create({
      challengeSet: challengeSet.id,
      nonce: `0x${nonce}`,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      state: InstanceState.IN_PROGRESS, // Better than VERIFIED at creation
      identity,
    });

    return this.repo.save(instance);
  }

  /**
   * Find one instance with full relations needed for evidence checking
   */
  async findOneWithRelations(id: Uuid): Promise<ChallengeInstance> {
    const instance = await this.repo.findOne({
      where: { id: id as any },
      relations: [
        'identity',
        'evidences',
        'pendingVerification', // If you have a relation to PendingVerification
      ],
    });

    if (!instance) {
      throw new NotFoundException(`Challenge instance ${id} not found`);
    }

    return instance;
  }

  /**
   * Standard findOne — kept for backward compatibility
   */
  async findOne(id: Uuid): Promise<ChallengeInstance> {
    return this.findOneWithRelations(id); // Reuse with relations
  }

  /**
   * Update instance (e.g., status)
   */
  async update(
    id: Uuid,
    updates: Partial<ChallengeInstance>,
  ): Promise<ChallengeInstance> {
    const instance = await this.findOne(id);

    Object.assign(instance, updates);

    return this.repo.save(instance);
  }

  /**
   * Check if all mandatory evidence is submitted
   */
  async checkAllMandatoryEvidenceSubmitted(instanceId: Uuid): Promise<boolean> {
    const instance = await this.findOneWithRelations(instanceId);
    const challengeSet = await this.setService.findOne(instance.challengeSet);

    const mandatoryIds = challengeSet.mandatoryChallenges;
    const submittedIds = instance.evidences.map((e) => e.challengeId);

    return mandatoryIds.every((id) => submittedIds.includes(id));
  }
}

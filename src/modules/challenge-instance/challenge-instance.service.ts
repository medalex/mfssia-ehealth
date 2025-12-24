import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeInstance } from './entities/challenge-instance.entity';
import { CreateChallengeInstanceDto } from './dto/create-challenge-instance.dto';
import * as crypto from 'crypto';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { IdentityService } from '../mfssia-identity/mfssia-identity.service';
import { InstanceState } from '@/common/enums/instance-state.enum';

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
      state: InstanceState.VERIFIED,
      identity,
    });

    return this.repo.save(instance);
  }

  async findOne(id: string): Promise<ChallengeInstance> {
    const instance = await this.repo.findOne({
      where: { id },
      relations: ['identity', 'evidences'],
    });
    if (!instance) {
      throw new NotFoundException(`Challenge Instance ${id} not found`);
    }
    return instance;
  }

  async checkAllEvidenceSubmitted(instanceId: string): Promise<boolean> {
    const instance = await this.findOne(instanceId);
    const set = await this.setService.findOne(instance.challengeSet);
    const submittedIds = instance.evidences.map((e) => e.challengeId);

    return set.mandatoryChallenges.every((id) => submittedIds.includes(id));
  }
}

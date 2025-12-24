import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfssiaIdentity } from './entities/mfssia-identity.entity';
import { RegisterIdentityDto } from './dto/register-identity.dto';
import { RegistrationState } from '@/common/enums/registration-state.enum';

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(MfssiaIdentity)
    private readonly repo: Repository<MfssiaIdentity>,
  ) {}

  async register(dto: RegisterIdentityDto): Promise<MfssiaIdentity> {
    const existing = await this.repo.findOneBy({ identifier: dto.did });
    if (existing) {
      throw new ConflictException(`Identity ${dto.did} already registered`);
    }

    const identity = this.repo.create({
      identifier: dto.did,
      requestedChallengeSet: dto.requestedChallengeSet,
      registrationState: RegistrationState.REGISTERED,
      registeredAt: new Date(),
    });

    return this.repo.save(identity);
  }

  async findByDid(did: string): Promise<MfssiaIdentity> {
    const identity = await this.repo.findOne({
      where: { identifier: did },
      relations: ['challengeInstances'],
    });
    if (!identity) {
      throw new NotFoundException(`Identity ${did} not found`);
    }
    return identity;
  }
}

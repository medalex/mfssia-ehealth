import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChallengeSet } from './entities/challenge-set.entity';
import { CreateChallengeSetDto } from './dto/create-challenge-set.dto';
import { UpdateChallengeSetDto } from './dto/update-challenge-set.dto';
import { ChallengeDefinition } from '../challenge-definitions/entities/challenge-definitions.entity';

@Injectable()
export class ChallengeSetService {
  constructor(
    @InjectRepository(ChallengeSet)
    private readonly setRepo: Repository<ChallengeSet>,
    @InjectRepository(ChallengeDefinition)
    private readonly defRepo: Repository<ChallengeDefinition>,
  ) {}

  async create(dto: CreateChallengeSetDto): Promise<ChallengeSet> {
    const exists = await this.setRepo.findOneBy({ code: dto.code });
    if (exists) {
      throw new ConflictException(
        `Challenge Set with code '${dto.code}' already exists`,
      );
    }

    // Validate that all referenced definitions exist
    const allIds = [
      ...dto.mandatoryChallenges,
      ...(dto.optionalChallenges || []),
    ];
    const definitions = await this.defRepo.findBy({ id: In(allIds) });
    if (definitions.length !== allIds.length) {
      throw new BadRequestException(
        'One or more referenced Challenge Definitions do not exist',
      );
    }

    const set = this.setRepo.create({
      ...dto,
      challengeDefinitions: definitions,
      mandatoryChallenges: dto.mandatoryChallenges,
      optionalChallenges: dto.optionalChallenges || [],
    });

    return this.setRepo.save(set);
  }

  async findAll(): Promise<ChallengeSet[]> {
    return this.setRepo.find({ relations: ['challengeDefinitions'] });
  }

  async findOne(code: string): Promise<ChallengeSet> {
    const set = await this.setRepo.findOne({
      where: { code: code },
      relations: ['challengeDefinitions'],
    });
    if (!set) {
      throw new NotFoundException(`Challenge Set ${code} not found`);
    }
    return set;
  }

  async update(id: string, dto: UpdateChallengeSetDto): Promise<ChallengeSet> {
    const set = await this.findOne(id);

    if (dto.mandatoryChallenges || dto.optionalChallenges) {
      const allIds = [
        ...(dto.mandatoryChallenges || set.mandatoryChallenges),
        ...(dto.optionalChallenges || set.optionalChallenges || []),
      ];
      const definitions = await this.defRepo.findBy({ id: In(allIds) });
      if (definitions.length !== new Set(allIds).size) {
        throw new BadRequestException(
          'Invalid Challenge Definition references',
        );
      }
      set.challengeDefinitions = definitions;
      set.mandatoryChallenges =
        dto.mandatoryChallenges || set.mandatoryChallenges;
      set.optionalChallenges = dto.optionalChallenges || set.optionalChallenges;
    }

    Object.assign(set, dto);
    return this.setRepo.save(set);
  }

  async remove(id: string): Promise<void> {
    const set = await this.findOne(id);
    await this.setRepo.remove(set);
  }
}

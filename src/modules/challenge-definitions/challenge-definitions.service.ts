import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChallengeDefinitionDto } from './dto/create-challenge-definition.dto';
import { UpdateChallengeDefinitionDto } from './dto/update-challenge-definition.dto';
import { ChallengeDefinition } from './entities/challenge-definitions.entity';
import { FactorClass } from '@/common/enums/factor-class.enum';
import { OracleType } from '@/common/enums/oracle-type.enum';

@Injectable()
export class ChallengeDefinitionService {
  constructor(
    @InjectRepository(ChallengeDefinition)
    private readonly repo: Repository<ChallengeDefinition>,
  ) {}

  async create(
    dto: CreateChallengeDefinitionDto,
  ): Promise<ChallengeDefinition> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) {
      throw new ConflictException(
        `Challenge Definition with id ${dto.id} already exists`,
      );
    }
    if (!Object.values(FactorClass).includes(dto.factorClass)) {
      throw new BadRequestException('Invalid factor class');
    }
    if (!Object.values(OracleType).includes(dto.oracle.oracleType)) {
      throw new BadRequestException('Invalid oracle type');
    }
    const definition = this.repo.create(dto);
    return this.repo.save(definition);
  }

  async findAll(): Promise<ChallengeDefinition[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<ChallengeDefinition> {
    const definition = await this.repo.findOneBy({ id });
    if (!definition) {
      throw new NotFoundException(`Challenge Definition ${id} not found`);
    }
    return definition;
  }

  async update(
    id: string,
    dto: UpdateChallengeDefinitionDto,
  ): Promise<ChallengeDefinition> {
    const definition = await this.findOne(id);
    Object.assign(definition, dto);
    return this.repo.save(definition);
  }

  async remove(id: string): Promise<void> {
    const definition = await this.findOne(id);
    await this.repo.remove(definition);
  }
}

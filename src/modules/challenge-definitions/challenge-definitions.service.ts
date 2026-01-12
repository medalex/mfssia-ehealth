import {
  Injectable,
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
import { Uuid } from '@/common/types/common.type';
import { DkgService } from '@/providers/dkg/dkg.service';
import { ChallengeDefinitionDkgMapper } from './challenge-definition.dkg.mapper';

@Injectable()
export class ChallengeDefinitionService {
  constructor(
    @InjectRepository(ChallengeDefinition)
    private readonly repo: Repository<ChallengeDefinition>,
    private readonly dkgService: DkgService,
  ) {}

  async create(
    dto: CreateChallengeDefinitionDto,
  ): Promise<ChallengeDefinition> {
    const existing = await this.repo.findOneBy({ code: dto.code });

    if (existing) {
      throw new ConflictException(`Challenge with code ${dto.code} already exists`);
    }

    if (!Object.values(FactorClass).includes(dto.factorClass)) {
      throw new BadRequestException('Invalid factor class');
    }
    
    if (!Object.values(OracleType).includes(dto.oracle.oracleType)) {
      throw new BadRequestException('Invalid oracle type');
    }

    const definition = this.repo.create(dto);
    const dkgDto = ChallengeDefinitionDkgMapper.toDkgDto(definition);

    const dkgChallengeDefinition = await this.dkgService.createAsset(dkgDto);
    
    definition.ual = dkgChallengeDefinition.UAL;

    return this.repo.save(definition); 
  }

  async findAll(): Promise<ChallengeDefinition[]> {
    return this.repo.find();
  }

  async findOne(code: string): Promise<ChallengeDefinition> {
    const definition = await this.repo.findOneBy({ code: code });
    if (definition) {
      throw new ConflictException(`Challenge with code ${code} not found`);
    }
    return definition;
  }

  async update(
    id: Uuid,
    dto: UpdateChallengeDefinitionDto,
  ): Promise<ChallengeDefinition> {
    const definition = await this.findOne(id);
    Object.assign(definition, dto);
    return this.repo.save(definition);
  }

  async remove(id: Uuid): Promise<void> {
    const definition = await this.findOne(id);
    await this.repo.remove(definition);
  }
}

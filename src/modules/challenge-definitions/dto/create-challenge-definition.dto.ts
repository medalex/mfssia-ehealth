import { OracleType } from '@/common/enums/oracle-type.enum';
import { ResultType } from '@/constants/resultType';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ChallengeStatus } from 'src/common/enums/challenge-status.enum';
import { FactorClass } from 'src/common/enums/factor-class.enum';

export class EvidenceTypeDto {
  @ApiProperty({
    description: 'Type of the evidence',
    example: 'mfssia:EvidenceType',
  })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Name of the evidence field', example: 'source' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Data type of the evidence', example: 'string' })
  @IsString()
  dataType: string;
}

export class OracleDto {
  @ApiProperty({ description: 'Type of the oracle', example: 'mfssia:Oracle' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Name of the oracle',
    example: 'Publisher Whitelist Oracle',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Type of oracle (CHAINLINK, INTERNAL, etc.)',
    enum: OracleType,
    example: OracleType.CHAINLINK,
  })
  @IsEnum(OracleType)
  oracleType: OracleType;

  @ApiProperty({
    description: 'Method for verification',
    example: 'Compare source against DAO-approved list',
  })
  @IsString()
  verificationMethod: string;
}

export class EvaluationDto {
  @ApiProperty({
    description: 'Type of result (BOOLEAN, SCORE)',
    enum: ResultType,
    example: ResultType.assertions,
  })
  @IsEnum(ResultType)
  resultType: ResultType;

  @ApiProperty({
    description: 'Condition for passing',
    example: 'source ∈ whitelist',
  })
  @IsString()
  passCondition: string;
}

export class CreateChallengeDefinitionDto {
  @ApiProperty({
    description: 'Unique ID of the challenge',
    example: 'mfssia:C-A-1',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Human-readable name',
    example: 'Source Authenticity Challenge',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Purpose and details',
    example:
      'Verifies the article originates from an approved public-sector publisher.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Factor class (SourceIntegrity, etc.)',
    example: FactorClass.SOURCE_INTEGRITY,
    enum: FactorClass,
  })
  @IsEnum(FactorClass)
  factorClass: FactorClass;

  @ApiProperty({
    description: 'Formal verification question',
    example: 'Does the article originate from a whitelisted source?',
  })
  @IsString()
  question: string;

  @ApiProperty({
    type: [EvidenceTypeDto],
    description: 'Array of expected evidence types',
  })
  @IsArray()
  expectedEvidence: EvidenceTypeDto[];

  @ApiProperty({ type: OracleDto, description: 'Oracle configuration' })
  @IsObject()
  oracle: OracleDto;

  @ApiProperty({ type: EvaluationDto, description: 'Evaluation rules' })
  @IsObject()
  evaluation: EvaluationDto;

  @ApiProperty({
    description: 'Effect on failure',
    example: 'Pipeline execution rejected',
  })
  @IsString()
  failureEffect: string;

  @ApiProperty({ description: 'Reusability scope', example: 'GLOBAL' })
  @IsString()
  reusability: string;

  @ApiProperty({ description: 'Version of the definition', example: '1.0' })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Status (ACTIVE, etc.)',
    example: 'ACTIVE',
    enum: ChallengeStatus,
  })
  @IsEnum(ChallengeStatus)
  status: ChallengeStatus;
}

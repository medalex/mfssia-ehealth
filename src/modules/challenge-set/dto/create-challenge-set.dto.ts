import { AggregationRule } from '@/common/enums/aggregation-rule.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsObject,
  IsNumber,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';

export class PublishedByDto {
  @ApiProperty({ description: 'Type of publisher', example: 'Organization' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Name of the publisher', example: 'MFSSIA DAO' })
  @IsString()
  name: string;
}

export class PolicyDto {
  @ApiProperty({ description: 'Minimum challenges to pass', example: 5 })
  @IsNumber()
  minChallengesRequired: number;

  @ApiProperty({
    description: 'Rule for aggregation',
    enum: AggregationRule,
    example: AggregationRule.ALL_MANDATORY,
  })
  @IsEnum(AggregationRule)
  aggregationRule: AggregationRule;

  @ApiProperty({
    description: 'Confidence threshold',
    example: null,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  confidenceThreshold?: number | null;
}

export class LifecycleDto {
  @ApiProperty({ description: 'Creation event', example: 'DAO_APPROVAL' })
  @IsString()
  creationEvent: string;

  @ApiProperty({ description: 'Mutation policy', example: 'IMMUTABLE' })
  @IsString()
  mutation: string;

  @ApiProperty({
    description: 'Deprecation policy',
    example: 'VERSIONED_REPLACEMENT',
  })
  @IsString()
  deprecationPolicy: string;
}

export class CreateChallengeSetDto {
  @ApiProperty({
    description: 'Unique semantic code for the challenge set',
    example: 'mfssia:Example-A',
    pattern: '^mfssia:Example-[A-Z]$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^mfssia:Example-[A-Z]$/, {
    message: 'Code must follow format mfssia:Example-X (X = A-Z)',
  })
  code: string;

  @ApiProperty({
    description: 'Name of the set',
    example: 'Example A – Baseline RDF Artifact Integrity',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed description',
    example: 'Minimal MFSSIA challenge set ensuring source authenticity...',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Version', example: '1.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Status', example: 'ACTIVE' })
  @IsString()
  status: string;

  @ApiProperty({ type: PublishedByDto, description: 'Publisher details' })
  @IsObject()
  publishedBy: PublishedByDto;

  @ApiProperty({ type: [String], description: 'Mandatory challenge IDs' })
  @IsArray()
  @IsString({ each: true })
  mandatoryChallenges: string[];

  @ApiProperty({ type: [String], description: 'Optional challenge IDs' })
  @IsArray()
  @IsString({ each: true })
  optionalChallenges: string[];

  @ApiProperty({ type: PolicyDto, description: 'Policy rules' })
  @IsObject()
  policy: PolicyDto;

  @ApiProperty({ type: LifecycleDto, description: 'Lifecycle details' })
  @IsObject()
  lifecycle: LifecycleDto;
}

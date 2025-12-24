import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChallengeSetResponseDto {
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
    description: 'Name',
    example: 'Example A – Baseline RDF Artifact Integrity',
  })
  name: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ example: '1.0' })
  version: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({
    type: 'object',
    properties: {
      type: { type: 'string', example: 'Organization' },
      name: { type: 'string', example: 'MFSSIA DAO' },
    },
  })
  publishedBy: { type: string; name: string };

  @ApiProperty({ type: [String], example: ['mfssia:C-A-1', 'mfssia:C-A-2'] })
  mandatoryChallenges: string[];

  @ApiProperty({ type: [String], example: ['mfssia:C-A-5'] })
  optionalChallenges: string[];

  @ApiProperty({
    type: 'object',
    properties: {
      minChallengesRequired: { type: 'integer', example: 5 },
      aggregationRule: { type: 'string', example: 'ALL_MANDATORY' },
      confidenceThreshold: { type: 'number', nullable: true, example: null },
    },
  })
  policy: {
    minChallengesRequired: number;
    aggregationRule: string;
    confidenceThreshold?: number | null;
  };

  @ApiProperty({
    type: 'object',
    properties: {
      creationEvent: { type: 'string' },
      mutation: { type: 'string' },
      deprecationPolicy: { type: 'string' },
    },
  })
  lifecycle: {
    creationEvent: string;
    mutation: string;
    deprecationPolicy: string;
  };
}

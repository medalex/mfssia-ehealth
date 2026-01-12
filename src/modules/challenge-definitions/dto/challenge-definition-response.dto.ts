import { ApiProperty } from '@nestjs/swagger';

export class ChallengeDefinitionResponseDto {
  @ApiProperty({ description: 'Unique ID', example: 'mfssia:C-A-1' })
  id: string;

  @ApiProperty({
    description: 'Human readable name',
    example: 'Source Authenticity Challenge',
  })
  name: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ description: 'Factor class', example: 'SourceIntegrity' })
  factorClass: string;

  @ApiProperty({ description: 'Verification question' })
  question: string;

  @ApiProperty({
    description: 'Expected evidence types',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'mfssia:EvidenceType' },
        name: { type: 'string', example: 'source' },
        dataType: { type: 'string', example: 'string' },
      },
    },
  })
  expectedEvidence: Array<{ type: string; name: string; dataType: string }>;

  @ApiProperty({
    description: 'Oracle configuration',
    type: 'object',
    properties: {
      type: { type: 'string' },
      name: { type: 'string' },
      oracleType: { type: 'string' },
      verificationMethod: { type: 'string' },
    },
  })
  oracle: {
    type: string;
    name: string;
    oracleType: string;
    verificationMethod: string;
  };

  @ApiProperty({
    description: 'Evaluation rules',
    type: 'object',
    properties: {
      resultType: { type: 'string', example: 'BOOLEAN' },
      passCondition: { type: 'string' },
    },
  })
  evaluation: { resultType: string; passCondition: string };

  @ApiProperty({ description: 'Effect on failure' })
  failureEffect: string;

  @ApiProperty({ description: 'Reusability scope', example: 'GLOBAL' })
  reusability: string;

  @ApiProperty({ description: 'Version', example: '1.0' })
  version: string;

  @ApiProperty({ description: 'Status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'UAL from DKG', example: '...'})
  ual: string;
}

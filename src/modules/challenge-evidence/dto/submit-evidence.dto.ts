import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SubmitEvidenceDto {
  @ApiProperty({
    description: 'ID of the challenge instance',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  @IsString()
  @IsNotEmpty()
  challengeInstanceId: string;

  @ApiProperty({
    description: 'Specific challenge being responded to',
    example: 'mfssia:C-A-1',
  })
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description:
      'Evidence artifact matching expectedEvidence in ChallengeDefinition',
    example: { source: 'err.ee', contentHash: '0xabc123...' },
  })
  @IsObject()
  evidence: Record<string, any>;
}

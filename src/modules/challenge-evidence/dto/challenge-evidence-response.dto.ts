import { ApiProperty } from '@nestjs/swagger';

export class ChallengeEvidenceResponseDto {
  @ApiProperty({ description: 'Evidence UUID' })
  id: string;

  @ApiProperty({ description: 'Challenge ID', example: 'mfssia:C-A-1' })
  challengeId: string;

  @ApiProperty({
    description: 'Submitted evidence data',
    example: 'Data submitted',
  })
  evidence: Record<string, any>;

  @ApiProperty({ description: 'Submission timestamp' })
  submittedAt: Date;
}

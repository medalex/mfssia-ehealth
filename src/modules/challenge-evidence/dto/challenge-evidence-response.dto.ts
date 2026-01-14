import { ApiProperty } from '@nestjs/swagger';

export class ChallengeEvidenceItemDto {
  @ApiProperty({ description: 'Evidence UUID' })
  id: string;

  @ApiProperty({
    description: 'Challenge ID',
    example: 'mfssia:C-A-1',
  })
  challengeId: string;

  @ApiProperty({
    description: 'Submitted evidence data',
    example: {
      source: 'err.ee',
      contentHash: '0xabc123',
    },
  })
  evidence: Record<string, any>;

  @ApiProperty({ description: 'Submission timestamp' })
  submittedAt: Date;
}

export class SubmitEvidenceBatchResponseDto {
  @ApiProperty({
    description: 'Challenge instance ID',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  challengeInstanceId: string;

  @ApiProperty({
    description: 'Current state of the challenge instance',
    example: 'VERIFICATION_IN_PROGRESS',
  })
  state: string;

  @ApiProperty({
    description: 'Idempotency key used for this submission',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  idempotencyKey: string;

  @ApiProperty({
    description: 'Submitted evidence per challenge',
    type: [ChallengeEvidenceItemDto],
  })
  evidences: ChallengeEvidenceItemDto[];

  @ApiProperty({
    description: 'Oracle verification request ID (if triggered)',
    example: 'oracle-req-123456',
    nullable: true,
  })
  oracleRequestId?: string;

  @ApiProperty({
    description: 'Submission timestamp',
  })
  submittedAt: Date;
}

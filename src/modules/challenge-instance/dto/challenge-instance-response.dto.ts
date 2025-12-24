import { InstanceState } from '@/common/enums/instance-state.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ChallengeInstanceResponseDto {
  @ApiProperty({ description: 'Instance UUID' })
  id: string;

  @ApiProperty({ description: 'Challenge set ID', example: 'mfssia:Example-A' })
  challengeSet: string;

  @ApiProperty({
    description: 'DID of subject',
    example: 'did:web:woodhive.ee',
  })
  subjectDid: string;

  @ApiProperty({ description: 'Nonce for anti-replay', example: '0xabc123...' })
  nonce: string;

  @ApiProperty({ description: 'Issued timestamp' })
  issuedAt: Date;

  @ApiProperty({ description: 'Expiry timestamp' })
  expiresAt: Date;

  @ApiProperty({ enum: InstanceState, example: InstanceState.IN_PROGRESS })
  state: InstanceState;

  @ApiProperty({ description: 'Number of submitted evidences', example: 3 })
  submittedEvidenceCount: number;
}

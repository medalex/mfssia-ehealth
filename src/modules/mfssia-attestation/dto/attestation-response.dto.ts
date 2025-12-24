import { ApiProperty } from '@nestjs/swagger';

export class AttestationResponseDto {
  @ApiProperty({ description: 'Final status', example: 'SUCCESS' })
  status: string;

  @ApiProperty({
    description: 'DKG UAL if successful',
    example: 'dkg:ual:identity-attestation:did:web:userA:example-a',
  })
  ual?: string;

  @ApiProperty({
    description: 'Verified challenges',
    type: [String],
    example: ['mfssia:C-A-1', 'mfssia:C-A-2'],
  })
  verifiedChallenges?: string[];
}

import { ApiProperty } from '@nestjs/swagger';

export class MfssiaAttestationResponseDto {
  @ApiProperty({ description: 'Attestation UUID' })
  id: string;

  @ApiProperty({ description: 'Subject DID', example: 'did:web:woodhive.ee' })
  identity: string;

  @ApiProperty({
    description: 'Challenge set used',
    example: 'mfssia:Example-A',
  })
  challengeSet: string;

  @ApiProperty({ type: [String], description: 'List of passed challenges' })
  verifiedChallenges: string[];

  @ApiProperty({ description: 'Oracle proof (requestId)' })
  oracleAttestation: string;

  @ApiProperty({ description: 'Valid from' })
  validFrom: Date;

  @ApiProperty({ description: 'Valid until' })
  validUntil: Date;

  @ApiProperty({
    description: 'DKG UAL',
    example: 'dkg:ual:identity-attestation:...',
  })
  ual?: string;
}

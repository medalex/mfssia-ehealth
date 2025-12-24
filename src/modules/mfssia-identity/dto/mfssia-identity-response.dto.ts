import { RegistrationState } from '@/common/enums/registration-state.enum';
import { ApiProperty } from '@nestjs/swagger';

export class MfssiaIdentityResponseDto {
  @ApiProperty({
    example: '2e8f31d2-6b6b-4e34-b7a5-05c89f91d32c',
    description: 'Unique identifier for the property (UUID v4).',
  })
  id: string;

  @ApiProperty({ description: 'DID', example: 'did:web:woodhive.ee' })
  identifier: string;

  @ApiProperty({
    description: 'Selected challenge set',
    example: 'mfssia:Example-A',
  })
  requestedChallengeSet: string;

  @ApiProperty({
    description: 'Current state',
    enum: RegistrationState,
    example: RegistrationState.PENDING_CHALLENGE,
  })
  registrationState: RegistrationState;

  @ApiProperty({
    description: 'Registration timestamp',
    example: '2025-12-24T10:00:00Z',
  })
  registeredAt: Date;
}

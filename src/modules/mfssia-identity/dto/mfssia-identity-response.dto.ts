import { RegistrationState } from '@/common/enums/registration-state.enum';
import { ApiProperty } from '@nestjs/swagger';

export class MfssiaIdentityResponseDto {
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

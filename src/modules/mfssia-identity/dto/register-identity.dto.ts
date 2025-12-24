import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterIdentityDto {
  @ApiProperty({
    description: 'Decentralized Identifier of the user',
    example: 'did:web:woodhive.ee',
  })
  @IsString()
  @IsNotEmpty()
  did: string;

  @ApiProperty({
    description: 'Selected challenge set from marketplace',
    example: 'mfssia:Example-A',
  })
  @IsString()
  @IsNotEmpty()
  requestedChallengeSet: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChallengeInstanceDto {
  @ApiProperty({
    description: 'DID of the subject',
    example: 'did:web:woodhive.ee',
  })
  @IsString()
  @IsNotEmpty()
  did: string;

  @ApiProperty({
    description: 'Approved challenge set ID',
    example: 'mfssia:Example-A',
  })
  @IsString()
  @IsNotEmpty()
  challengeSet: string;
}

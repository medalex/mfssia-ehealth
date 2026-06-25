import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RevokeConsentDto {
  @ApiProperty({ example: '00000000-0000-0000-0004-000000000001' })
  @IsString()
  @IsNotEmpty()
  consentId: string;
}

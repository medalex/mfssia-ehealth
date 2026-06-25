import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PublishConsentDto {
  @ApiProperty({ example: '00000000-0000-0000-0004-000000000001' })
  @IsString()
  @IsNotEmpty()
  consentId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'hospital-1' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: '2026-06-25T19:35:00.000Z' })
  @IsString()
  @IsNotEmpty()
  grantedAt: string;

  @ApiProperty({ example: '2126-06-25T19:35:00.000Z' })
  @IsString()
  @IsNotEmpty()
  validUntil: string;
}

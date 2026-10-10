import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CheckAccessDto {
  @ApiProperty({ example: '00000000-0000-0000-0002-000000000001' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'lab-a' })
  @IsString()
  @IsNotEmpty()
  custodianId: string;

  @ApiProperty({ example: 'pilot-001', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  runId?: string;
}

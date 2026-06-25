import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CheckAccessDto {
  @ApiProperty({ example: '00000000-0000-0000-0002-000000000001' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  patientId: string;
}

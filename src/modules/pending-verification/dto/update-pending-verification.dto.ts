import { PartialType } from '@nestjs/mapped-types';
import { CreatePendingVerificationDto } from './create-pending-verification.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePendingVerificationDto extends PartialType(
  CreatePendingVerificationDto,
) {
  @IsOptional()
  @IsString()
  rawResponse?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

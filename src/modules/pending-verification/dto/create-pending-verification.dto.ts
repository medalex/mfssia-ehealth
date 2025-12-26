import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PendingVerificationStatus } from '../pending-verification.enums';

export class CreatePendingVerificationDto {
  @IsString()
  @IsUUID()
  instanceId: string;

  @IsString()
  requestId: string;

  @IsString()
  subjectDid: string;

  @IsString()
  challengeSetCode: string;

  @IsOptional()
  @IsString()
  txHash?: string;

  @IsOptional()
  @IsEnum(PendingVerificationStatus)
  status?: PendingVerificationStatus;
}

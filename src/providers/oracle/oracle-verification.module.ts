import { Module } from '@nestjs/common';
import { VerificationService } from './oracle-verification.service';
import { PendingVerificationModule } from '@/modules/pending-verification/pending-verification.module';

@Module({
  imports: [PendingVerificationModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}

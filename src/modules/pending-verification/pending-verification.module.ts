import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PendingVerificationService } from './pending-verification.service';
import { PendingVerification } from './entities/pending-verification.entity';
import { PendingVerificationRepository } from './pending-verification.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PendingVerification])],
  providers: [PendingVerificationRepository, PendingVerificationService],
  exports: [PendingVerificationRepository, PendingVerificationService],
})
export class PendingVerificationModule {}

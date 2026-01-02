import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { ChallengeEvidenceService } from './challenge-evidence.service';
import { ChallengeEvidenceController } from './challenge-evidence.controller';
import { ChallengeInstanceModule } from '../challenge-instance/challenge-instance.module';
import { OracleVerificationModule } from '@/providers/oracle/oracle-verification.module';
import { ChallengeSetModule } from '../challenge-set/challenge-set.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeEvidence]),
    ChallengeInstanceModule, // Provides ChallengeInstanceService
    ChallengeSetModule, // ← Provides ChallengeSetService
    OracleVerificationModule, // ← Provides OracleVerificationService
  ],
  providers: [ChallengeEvidenceService],
  controllers: [ChallengeEvidenceController],
  exports: [ChallengeEvidenceService],
})
export class ChallengeEvidenceModule {}

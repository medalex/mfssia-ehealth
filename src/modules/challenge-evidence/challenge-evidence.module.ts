import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { ChallengeEvidenceService } from './challenge-evidence.service';
import { ChallengeEvidenceController } from './challenge-evidence.controller';
import { ChallengeInstanceModule } from '../challenge-instance/challenge-instance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeEvidence]),
    ChallengeInstanceModule,
  ],
  providers: [ChallengeEvidenceService],
  controllers: [ChallengeEvidenceController],
  exports: [ChallengeEvidenceService],
})
export class ChallengeEvidenceModule {}

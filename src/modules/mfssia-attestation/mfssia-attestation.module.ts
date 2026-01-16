import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MfssiaAttestation } from './entities/mfssia-attestation.entity';
import { ChallengeInstanceModule } from '../challenge-instance/challenge-instance.module';
import { DkgModule } from 'src/providers/dkg/dkg.module';
import { AttestationService } from './mfssia-attestation.service';
import { AttestationController } from './mfssia-attestation.controller';
import { ChallengeSet } from '../challenge-set/entities/challenge-set.entity';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { ChallengeSetModule } from '../challenge-set/challenge-set.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MfssiaAttestation]),
    DkgModule,
    ChallengeInstanceModule,
    ChallengeSetModule
  ],
  providers: [AttestationService],
  controllers: [AttestationController],
  exports: [AttestationService],
})
export class AttestationModule {}

import { Module } from '@nestjs/common';
import { OracleVerificationService } from './oracle-verification.service';
import { PendingVerificationModule } from '@/modules/pending-verification/pending-verification.module';
import { OracleListenerService } from './listeners/oracle-listener.service';
import { ChallengeInstanceModule } from '@/modules/challenge-instance/challenge-instance.module';
import { ChallengeSetModule } from '@/modules/challenge-set/challenge-set.module';
import { AttestationModule } from '@/modules/mfssia-attestation/mfssia-attestation.module';
import { DkgModule } from '../dkg/dkg.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    PendingVerificationModule,
    ChallengeInstanceModule, // ← Provides ChallengeInstanceService
    ChallengeSetModule,
    AttestationModule,
    DkgModule,
    EventEmitterModule.forRoot(), // ✅ Add this to provide EventEmitter2
  ],
  providers: [OracleVerificationService, OracleListenerService],
  exports: [OracleVerificationService],
})
export class OracleVerificationModule {}

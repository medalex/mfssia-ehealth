import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MfssiaAttestation } from './entities/mfssia-attestation.entity';
import { ChallengeInstanceModule } from '../challenge-instance/challenge-instance.module';
import { DkgModule } from 'src/providers/dkg/dkg.module';
import { AttestationService } from './mfssia-attestation.service';
import { AttestationController } from './mfssia-attestation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MfssiaAttestation]),
    DkgModule,
    ChallengeInstanceModule,
  ],
  providers: [AttestationService],
  controllers: [AttestationController],
  exports: [AttestationService],
})
export class AttestationModule {}

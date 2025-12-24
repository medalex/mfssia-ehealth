import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeInstance } from './entities/challenge-instance.entity';
import { ChallengeInstanceService } from './challenge-instance.service';
import { ChallengeInstanceController } from './challenge-instance.controller';
import { ChallengeSetModule } from '../challenge-set/challenge-set.module';
import { IdentityModule } from '../mfssia-identity/mfssia-identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeInstance]),
    IdentityModule,
    ChallengeSetModule,
  ],
  providers: [ChallengeInstanceService],
  controllers: [ChallengeInstanceController],
  exports: [ChallengeInstanceService],
})
export class ChallengeInstanceModule {}

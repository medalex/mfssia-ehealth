import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeSet } from './entities/challenge-set.entity';
import { ChallengeSetService } from './challenge-set.service';
import { ChallengeSetController } from './challenge-set.controller';
import { ChallengeDefinition } from '../challenge-definitions/entities/challenge-definitions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChallengeSet, ChallengeDefinition])],
  providers: [ChallengeSetService],
  controllers: [ChallengeSetController],
  exports: [ChallengeSetService],
})
export class ChallengeSetModule {}

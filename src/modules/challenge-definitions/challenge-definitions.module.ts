import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeDefinition } from './entities/challenge-definitions.entity';
import { ChallengeDefinitionService } from './challenge-definitions.service';
import { ChallengeDefinitionController } from './challenge-definitions.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChallengeDefinition]), DkgModule],
  providers: [ChallengeDefinitionService],
  controllers: [ChallengeDefinitionController],
  exports: [ChallengeDefinitionService],
})
export class ChallengeDefinitionModule {}

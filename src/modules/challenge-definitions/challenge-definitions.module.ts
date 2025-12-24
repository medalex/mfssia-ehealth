import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeDefinition } from './entities/challenge-definitions.entity';
import { ChallengeDefinitionService } from './challenge-definitions.service';
import { ChallengeDefinitionController } from './challenge-definitions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChallengeDefinition])],
  providers: [ChallengeDefinitionService],
  controllers: [ChallengeDefinitionController],
  exports: [ChallengeDefinitionService],
})
export class ChallengeDefinitionModule {}

// src/dkg/mappers/challenge-definition.dkg.mapper.ts
import { ChallengeDefinition } from '@/modules/challenge-definitions/entities/challenge-definitions.entity';
import { ChallengeDefinitionDkgDto } from '@/modules/challenge-definitions/dto/challenge-definition.dkg.dto';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';

export class ChallengeDefinitionDkgMapper {
  static toDkgDto(entity: ChallengeDefinition): ChallengeDefinitionDkgDto {
    return {
      '@context': MFSSIA_CONTEXT,
      '@type': 'mfssia:ChallengeDefinition',
      '@id': `urn:challenge-definition:${entity.code}`,

      code: entity.code,
      name: entity.name,
      description: entity.description,

      factorClass: entity.factorClass,
      question: entity.question,

      expectedEvidence: entity.expectedEvidence,
      oracle: entity.oracle,
      evaluation: entity.evaluation,

      failureEffect: entity.failureEffect,
      reusability: entity.reusability,
      version: entity.version,
      status: entity.status,
    };
  }
}

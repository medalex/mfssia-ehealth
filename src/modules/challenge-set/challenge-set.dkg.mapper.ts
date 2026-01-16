// src/dkg/mappers/challenge-set.dkg.mapper.ts
import { ChallengeSet } from '@/modules/challenge-set/entities/challenge-set.entity';
import { ChallengeSetDkgDto } from '@/modules/challenge-set/dto/challenge-set.dkg.dto';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';

export class ChallengeSetDkgMapper {
  static toDkgDto(entity: ChallengeSet): ChallengeSetDkgDto {
    return {
      '@context': MFSSIA_CONTEXT,
      '@type': 'mfssia:ChallengeSet',
      '@id': `urn:challenge-set:${entity.code}`,

      // ===== business identifiers =====
      code: entity.code,
      name: entity.name,
      description: entity.description,

      // ===== versioning & state =====
      version: entity.version,
      status: entity.status,

      // ===== publisher info =====
      publishedBy: entity.publishedBy,

      // ===== challenge composition =====
      // IMPORTANT: these must be UALs / @id strings, NOT entities
      mandatoryChallenges: entity.mandatoryChallenges,
      optionalChallenges: entity.optionalChallenges,

      // ===== policy & lifecycle =====
      policy: entity.policy,
      lifecycle: entity.lifecycle,
    };
  }
}

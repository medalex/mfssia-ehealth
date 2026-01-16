// src/dkg/mappers/mfssia-attestation.dkg.mapper.ts
import { MfssiaAttestation } from '@/modules/mfssia-attestation/entities/mfssia-attestation.entity';

import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';
import { MfssiaAttestationDkgDto } from './dto/mfssia-attestation.dkg.dto';

export class MfssiaAttestationDkgMapper {
  static toDkgDto(
    entity: MfssiaAttestation,
  ): MfssiaAttestationDkgDto {
    return {
      '@context': MFSSIA_CONTEXT,
      '@type': 'mfssia:Attestation',

      // JSON-LD identity of the attestation
      // Stable and deterministic
      '@id': `urn:mfssia:attestation:${entity.identity}:${entity.challengeSet}`,

      // ===== core references =====
      identity: entity.identity, // DID
      challengeSet: entity.challengeSet, // UAL / URN
      verifiedChallenges: entity.verifiedChallenges, // UALs

      // ===== attestation data =====
      oracleAttestation: entity.oracleAttestation,
      aggregationRule: entity.aggregationRule,

      // ===== validity window =====
      validFrom: entity.validFrom.toISOString(),
      validUntil: entity.validUntil.toISOString(),

      // ===== external anchoring =====
      ual: entity.ual ?? null,
    };
  }
}

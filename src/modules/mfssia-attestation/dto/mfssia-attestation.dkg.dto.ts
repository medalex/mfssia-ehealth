// src/dkg/dto/mfssia-attestation.dkg.dto.ts
import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';
import { AggregationRule } from '@/common/enums/aggregation-rule.enum';

export class MfssiaAttestationDkgDto implements BaseDkgAssetDto {
  // ===== JSON-LD keywords =====
  '@context': typeof MFSSIA_CONTEXT;
  '@type': 'mfssia:Attestation';
  '@id': string;

  // ===== core references =====
  // DID of the subject being attested
  identity: string;

  // UAL / URN of the ChallengeSet used
  challengeSet: string;

  // Successfully verified ChallengeDefinition assets (UALs)
  verifiedChallenges: string[];

  // ===== attestation data =====
  // Oracle requestId / proof / composite evidence
  oracleAttestation: string;

  aggregationRule: AggregationRule;

  // ===== validity window =====
  validFrom: string;   // ISO 8601
  validUntil: string; // ISO 8601

  // ===== external anchoring =====
  ual?: string | null;
}

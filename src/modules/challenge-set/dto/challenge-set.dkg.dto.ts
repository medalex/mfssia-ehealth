// src/dkg/dto/challenge-set.dkg.dto.ts
import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';
import { AggregationRule } from '@/common/enums/aggregation-rule.enum';

export class ChallengeSetDkgDto implements BaseDkgAssetDto {
  // ===== JSON-LD keywords =====
  '@context': typeof MFSSIA_CONTEXT;
  '@type': 'mfssia:ChallengeSet';
  '@id': string;

  // ===== business identifiers =====
  code: string;
  name: string;
  description: string;

  // ===== versioning & state =====
  version: string;
  status: string;

  // ===== publisher info (stored as @json) =====
  publishedBy: {
    type: string;
    name: string;
  };

  // ===== challenge composition =====
  // references to ChallengeDefinition assets (UAL / DID)
  mandatoryChallenges: string[];
  optionalChallenges: string[];

  // ===== policy & lifecycle (stored as @json) =====
  policy: {
    minChallengesRequired: number;
    aggregationRule: AggregationRule;
    confidenceThreshold: number | null;
  };

  lifecycle: {
    creationEvent: string;
    mutation: string;
    deprecationPolicy: string;
  };
}

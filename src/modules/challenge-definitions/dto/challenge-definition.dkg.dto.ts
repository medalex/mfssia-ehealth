import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';

// src/dkg/dto/challenge-definition.dkg.dto.ts
export class ChallengeDefinitionDkgDto implements BaseDkgAssetDto{
  // ===== JSON-LD keywords =====
  '@context': typeof MFSSIA_CONTEXT;
  '@type': 'mfssia:ChallengeDefinition';
  '@id': string;

  // ===== business identifiers =====
  code: string;
  name: string;
  description: string;

  // ===== challenge semantics =====
  factorClass: string;
  question: string;

  // ===== complex structures (stored as @json) =====
  expectedEvidence: Array<{
    type: string;
    name: string;
    dataType: string;
  }>;

  oracle: {
    type: string;
    name: string;
    oracleType: string;
    verificationMethod: string;
  };

  evaluation: {
    resultType: string;
    passCondition: string;
  };

  // ===== outcome =====
  failureEffect: string;
  reusability: string;
  version: string;
  status: string;
}

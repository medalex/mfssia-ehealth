import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

export class RxPolicyDkgDto implements BaseDkgAssetDto {
  '@context': typeof RX_CONTEXT;
  '@type': 'rx:ClinicalPolicy';
  '@id': string;

  name: string;
  appliesToMedication: string;  // @id ref: urn:rx:medication:<code>
  clinicalCondition: string;
  comparisonOperator: string;
  threshold: number;
  conditionalThreshold?: string;
  deltaMax: number;
  publishedAt: string;          // ISO 8601 — prov:generatedAtTime
}

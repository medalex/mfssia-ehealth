import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

export class RxBridgeDkgDto implements BaseDkgAssetDto {
  '@context': typeof RX_CONTEXT;
  '@type': 'rx:NumericBridge';
  '@id': string;

  bridgeMetric: string;
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  publishedAt: string; // ISO 8601 — prov:generatedAtTime
}

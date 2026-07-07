import { RxBridgeDkgDto } from './dto/rx-bridge.dkg.dto';
import { NumericBridge } from './numeric-bridge.service';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

export class RxBridgeDkgMapper {
  // Stable, idempotent URN so re-seeding can skip bridges already in the DKG.
  // Units are slugified ('umol/L' → 'umol_L') to keep the URN clean.
  static id(b: NumericBridge): string {
    const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_');
    return `urn:rx:bridge:${b.metric}:${slug(b.fromUnit)}:${slug(b.toUnit)}`;
  }

  static toDkgDto(b: NumericBridge): RxBridgeDkgDto {
    return {
      '@context': RX_CONTEXT,
      '@type': 'rx:NumericBridge',
      '@id': RxBridgeDkgMapper.id(b),

      bridgeMetric: b.metric,
      fromUnit: b.fromUnit,
      toUnit: b.toUnit,
      conversionFactor: b.factor,
      publishedAt: new Date().toISOString(),
    };
  }
}

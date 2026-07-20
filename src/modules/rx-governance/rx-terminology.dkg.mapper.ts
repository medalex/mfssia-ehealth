import { RxTerminologyDkgDto } from './dto/rx-terminology.dkg.dto';
import { TerminologyBridge } from './terminology-bridge.service';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

export class RxTerminologyDkgMapper {
  // Stable, idempotent URN so re-publishing can skip alignments already in the DKG.
  static id(b: TerminologyBridge): string {
    const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_');
    return `urn:rx:align:${slug(b.system)}:${slug(b.code)}`;
  }

  static toDkgDto(b: TerminologyBridge): RxTerminologyDkgDto {
    return {
      '@context': RX_CONTEXT,
      '@type': 'rx:TerminologyBridge',
      '@id': RxTerminologyDkgMapper.id(b),

      alignsSystem: b.system,
      alignsCode: b.code,
      alignsTerm: b.term ?? '',
      alignsTo: b.alignsTo,
      publishedAt: new Date().toISOString(),
    };
  }
}

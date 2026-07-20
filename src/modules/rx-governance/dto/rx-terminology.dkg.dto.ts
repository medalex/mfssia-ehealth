import { BaseDkgAssetDto } from '@/providers/dkg/base-dkg-asset.dto';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

// A governance-approved terminology alignment axiom (rx:alignsTo). Aligns a clinical
// concept expressed in a heterogeneous coding system (e.g. a laboratory's local allergen
// vocabulary) to a governed rx concept (e.g. rx:Penicillin), so records coded differently
// can be recognised as the same clinical fact — the paper's terminological-conflict case.
export class RxTerminologyDkgDto implements BaseDkgAssetDto {
  '@context': typeof RX_CONTEXT;
  '@type': 'rx:TerminologyBridge';
  '@id': string;

  alignsSystem: string; // source coding system, e.g. "AllergyDB-Local" or "SNOMED-CT"
  alignsCode: string; // source code in that system, e.g. "PCN-001"
  alignsTerm: string; // human-readable source label, e.g. "penicillin allergy (local)"
  alignsTo: string; // governed rx concept IRI, e.g. "rx:Penicillin"
  publishedAt: string; // ISO 8601 — prov:generatedAtTime
}

import { TerminologyBridge } from './terminology-bridge.service';

/**
 * Candidate terminology-alignment reference. When a terminological conflict is detected
 * (a clinical concept arrives in a coding system with no rx:alignsTo axiom in T), the
 * auto-escalation looks up a *candidate* governed concept here and proposes the alignment
 * to the DAO. This is only a suggestion — the DAO members verify and vote; the reference
 * does not decide authoritatively. If a pair is absent, the alignment target is left for a
 * human domain expert to supply before approval.
 */
const REFERENCE: TerminologyBridge[] = [
  // A private diagnostics lab annotates a penicillin allergy under its local vocabulary;
  // the governed concept is rx:Penicillin (which the TBox subsumes under rx:BetaLactam).
  { system: 'AllergyDB-Local', code: 'PCN-001', term: 'penicillin allergy (local)', alignsTo: 'rx:Penicillin' },
  { system: 'AllergyDB-Local', code: 'AMOX-014', term: 'amoxicillin allergy (local)', alignsTo: 'rx:Amoxicillin' },
  // SNOMED-CT penicillin-allergy concept → governed rx concept.
  { system: 'SNOMED-CT', code: '294505008', term: 'penicillin allergy', alignsTo: 'rx:Penicillin' },
];

const canon = (s: string): string => String(s ?? '').trim().toLowerCase();

/** Returns a candidate governed concept for (system, code), or null. */
export function lookupAlignment(system: string, code: string): string | null {
  const hit = REFERENCE.find((r) => canon(r.system) === canon(system) && canon(r.code) === canon(code));
  return hit ? hit.alignsTo : null;
}

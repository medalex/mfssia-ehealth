import { NumericBridge } from './numeric-bridge.service';

/**
 * Canonical unit-conversion reference (UCUM / molar-mass derived).
 *
 * When a semantic conflict is detected (a metric arrives in a unit with no bridge
 * in T), the auto-escalation looks up a *candidate* conversion factor here and
 * proposes it to the DAO. This is only a suggestion — the DAO members verify and
 * vote; the reference does not decide authoritatively. If a pair is absent, the
 * factor is left for a human domain expert to supply before approval.
 */
const REFERENCE: NumericBridge[] = [
  // ── eGFR / renal function (the paper's running-case numerical conflict) ──────────
  // Governance-approved scale: CKD-EPI in mL/min/1.73m². An independent lab reports
  // creatinine clearance via Cockcroft-Gault in mL/min; the bridge normalises it onto
  // the CKD-EPI scale so both can be checked against Pol(Metformin, eGFR, >=, 30).
  // The Cockcroft-Gault→CKD-EPI factor is a representative body-surface-area
  // normalisation (1.73 / ~1.9 m²); the DAO members verify it before approval.
  { metric: 'eGFR', fromUnit: 'mL/min', toUnit: 'mL/min/1.73m²', factor: 0.91 },
  // Canonical-scale anchor: declares mL/min/1.73m² (CKD-EPI) as eGFR's governed scale
  // in theory T, so a metric is "under numeric governance" before any conversion exists.
  { metric: 'eGFR', fromUnit: 'mL/min/1.73m²', toUnit: 'mL/min/1.73m²', factor: 1 },
  // ── concentration bridges (generalisation examples) ─────────────────────────────
  // creatinine (molar mass 113.12 g/mol): 1 mg/dL = 88.42 µmol/L
  { metric: 'creatinine', fromUnit: 'umol/L', toUnit: 'mg/dL', factor: 0.0113122 },
  { metric: 'creatinine', fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 11.3122 },
  // glucose (molar mass 180.16 g/mol): 1 mmol/L = 18.016 mg/dL
  { metric: 'glucose', fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 18.016 },
  { metric: 'glucose', fromUnit: 'umol/L', toUnit: 'mg/dL', factor: 0.018016 },
];

// Canonicalises metric/unit tokens so "Creatinine"/"μmol/L" match "creatinine"/"umol/L".
const canon = (s: string): string => String(s ?? '').replace(/µ|μ/g, 'u').trim().toLowerCase();

/** Returns a candidate conversion factor for (metric, fromUnit → toUnit), or null. */
export function lookupFactor(metric: string, fromUnit: string, toUnit: string): number | null {
  const hit = REFERENCE.find(
    (r) => canon(r.metric) === canon(metric) && canon(r.fromUnit) === canon(fromUnit) && canon(r.toUnit) === canon(toUnit),
  );
  return hit ? hit.factor : null;
}

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
  // creatinine (molar mass 113.12 g/mol): 1 mg/dL = 88.42 µmol/L
  { metric: 'creatinine', fromUnit: 'umol/L', toUnit: 'mg/dL', factor: 0.0113122 },
  { metric: 'creatinine', fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 11.3122 },
  // glucose (molar mass 180.16 g/mol): 1 mmol/L = 18.016 mg/dL
  { metric: 'glucose', fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 18.016 },
  { metric: 'glucose', fromUnit: 'umol/L', toUnit: 'mg/dL', factor: 0.018016 },
];

/** Returns a candidate conversion factor for (metric, fromUnit → toUnit), or null. */
export function lookupFactor(metric: string, fromUnit: string, toUnit: string): number | null {
  const hit = REFERENCE.find(
    (r) => r.metric === metric && r.fromUnit === fromUnit && r.toUnit === toUnit,
  );
  return hit ? hit.factor : null;
}

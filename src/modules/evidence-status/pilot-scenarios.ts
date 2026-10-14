// Pilot scenarios P1–P4 published by PilotDemoSeedService when PILOT_DEMO_SEED=true.
// One physician (registry entry for hospital-1) queries all patients; every consent is granted
// to PILOT_ORGANIZATION_ID and lists the custodians it covers. offsetDays is relative to the
// evidence reference time (ClockService / EVIDENCE_REFERENCE_TIME).
export const PILOT_DOCTOR_ID = '00000000-0000-0000-0002-000000000001';
export const PILOT_ORGANIZATION_ID = 'hospital-1';

export interface PilotLabEvidence {
  custodianId: 'lab-a' | 'lab-b';
  value: string;
  offsetDays: number;
}

export interface PilotScenario {
  patientId: string;
  consentCustodians: string[];
  allergy?: { substance: 'Penicillin' };
  labResults: PilotLabEvidence[];
}

export const PILOT_SCENARIOS: PilotScenario[] = [
  {
    patientId: '00000000-0000-0000-0000-000000000001',
    consentCustodians: ['hospital-1', 'lab-a', 'lab-b'],
    labResults: [
      { custodianId: 'lab-a', value: '45', offsetDays: -365 },
      { custodianId: 'lab-b', value: '20', offsetDays: -7 },
    ],
  },
  {
    patientId: '00000000-0000-0000-0000-000000000002',
    consentCustodians: ['hospital-1', 'lab-a'],
    labResults: [
      { custodianId: 'lab-a', value: '45', offsetDays: -365 },
      { custodianId: 'lab-b', value: '20', offsetDays: -7 },
    ],
  },
  {
    patientId: '00000000-0000-0000-0000-000000000003',
    consentCustodians: ['hospital-1', 'lab-a', 'lab-b'],
    allergy: { substance: 'Penicillin' },
    labResults: [
      { custodianId: 'lab-a', value: '60', offsetDays: -7 },
    ],
  },
  {
    patientId: '00000000-0000-0000-0000-000000000004',
    consentCustodians: ['lab-a', 'lab-b'],
    labResults: [
      { custodianId: 'lab-a', value: '60', offsetDays: -7 },
    ],
  },
];

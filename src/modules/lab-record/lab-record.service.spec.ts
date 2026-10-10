// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import { LabRecordService } from './lab-record.service';

// The lab tree truncated implicitly at its capacity (2^LAB_DEPTH = 8 leaves): measurements
// past that never reached the root, and the membership walk then ran off the end of the tree
// with a TypeError. Milder than the allergy case — a dropped measurement is one that cannot
// be proved, so it is fail-closed — but it must say so rather than commit a partial root.
describe('LabRecordService — capacity', () => {
  const PATIENT = '00000000-0000-0000-0000-000000000001';

  const makeService = (n: number) => {
    const rows = Array.from({ length: n }, (_, i) => ({
      metric: `metric${i}`, value: `${40 + i}`, unit: 'mL/min', src: 'urn:org:lab-a',
      ts: '2026-06-25T14:00:00Z',
    }));
    const dkg = { findAssets: async () => ({ data: rows }) } as any;
    const evm = { addRootBestEffort: async () => undefined } as any;
    return new LabRecordService(dkg, evm);
  };

  it('more measurements than the tree holds fails loudly instead of dropping them', async () => {
    const service = makeService(9); // capacity is 8
    await service.onModuleInit();

    await expect(service.getProof(PATIENT, false)).rejects.toThrow(/9 lab measurements.*only 8 leaves/s);
  });

  it('does not treat a DKG lookup failure as an empty lab record', async () => {
    const dkg = { findAssets: async () => { throw new Error('connection refused'); } } as any;
    const service = new LabRecordService(dkg, { addRootBestEffort: async () => undefined } as any);
    await service.onModuleInit();

    await expect(service.getProof(PATIENT, false)).rejects.toThrow(/DKG unavailable.*lab results/);
  });

  it('exactly the tree capacity is still accepted', async () => {
    const service = makeService(8);
    await service.onModuleInit();

    const proof = await service.getProof(PATIENT, false);
    expect(proof.measurements).toHaveLength(8);
    expect(proof.labRecordRoot).toMatch(/^\d+$/);
  });

  it('filters returned measurements by source without changing the full-record root', async () => {
    const rows = [
      { metric: 'eGFR', value: '45', unit: 'mL/min', src: 'urn:org:lab-a', ts: '2025-10-10T08:00:00.000Z' },
      { metric: 'eGFR', value: '20', unit: 'mL/min', src: 'urn:org:lab-b', ts: '2026-10-03T08:00:00.000Z' },
    ];
    const service = new LabRecordService(
      { findAssets: async () => ({ data: rows }) } as any,
      { addRootBestEffort: async () => undefined } as any,
    );
    await service.onModuleInit();

    const completeProof = await service.getProof(PATIENT, false);
    const labAProof = await service.getProof(PATIENT, false, 'lab-a');
    const labBProof = await service.getProof(PATIENT, false, 'lab-b');

    expect(labAProof.labRecordRoot).toBe(completeProof.labRecordRoot);
    expect(labBProof.labRecordRoot).toBe(completeProof.labRecordRoot);
    expect(labAProof.measurements.map((item) => item.value)).toEqual([45]);
    expect(labBProof.measurements.map((item) => item.value)).toEqual([20]);
    await expect(service.getCustodianMeasurements(PATIENT, 'lab-a')).resolves.toMatchObject([
      { measuredBy: 'lab-a', value: 45 },
    ]);
  });
});

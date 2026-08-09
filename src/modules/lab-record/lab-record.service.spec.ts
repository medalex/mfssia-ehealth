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

  it('exactly the tree capacity is still accepted', async () => {
    const service = makeService(8);
    await service.onModuleInit();

    const proof = await service.getProof(PATIENT, false);
    expect(proof.measurements).toHaveLength(8);
    expect(proof.labRecordRoot).toMatch(/^\d+$/);
  });
});

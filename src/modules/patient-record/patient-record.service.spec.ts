// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import { PatientRecordService } from './patient-record.service';

// The allergy-count commitment adds fields to the proof; it must NOT move the root or the
// leaf formula. The root is a committed value that the ZKP, the on-chain CLASS B root set
// and every previously issued proof depend on — a change here silently invalidates them all.
//
// The expected roots below were captured from the endpoint BEFORE the change, by running the
// pre-change leaf/tree construction. They are hard-coded on purpose: recomputing them with
// the current code would make the test tautological.
describe('PatientRecordService — root invariance', () => {
  const PATIENT = '00000000-0000-0000-0000-000000000001';

  // Stubs: the service only needs findAssets (allergies) and the EVM publisher (no-op here).
  const makeService = (allergies: string[]) => {
    const dkg = {
      findAssets: async () => ({ data: allergies.map((s) => ({ substance: `rx:${s}` })) }),
    } as any;
    const evm = { addRootBestEffort: async () => undefined } as any;
    return new PatientRecordService(dkg, evm);
  };

  // Derived from the pre-change construction (leaf = Poseidon(patientField, idx+1), 8-leaf
  // Poseidon tree, allergies contiguous from index 0, zero padding), transcribed
  // independently of this service so the assertion is not tautological.
  const EXPECTED = {
    none: '11286972368698509976183087595462810875513684078608517520839298933882497716792',
    penicillin: '8583604894365662007605723798077551900114744153763972311712666394325449236869',
    two: '5050695798782746891161286694681135034491932513348218804138349229609325336675',
  };

  it('root for a patient with no allergies is unchanged', async () => {
    const service = makeService([]);
    await service.onModuleInit();
    const proof = await service.getProof(PATIENT, false);
    expect(proof.patientRecordRoot).toBe(EXPECTED.none);
    expect(proof.allergyCount).toBe(0);
  });

  it('root for a patient with one allergy is unchanged', async () => {
    const service = makeService(['Penicillin']);
    await service.onModuleInit();
    const proof = await service.getProof(PATIENT, false);
    expect(proof.patientRecordRoot).toBe(EXPECTED.penicillin);
    expect(proof.allergyCount).toBe(1);
  });

  it('more than N_MAX allergies fails loudly instead of committing a partial root', async () => {
    // N_MAX + 1 = 6. Truncating to 5 would commit a root the circuit then proves
    // completeness over — a guarantee about an already-incomplete record.
    const service = makeService([
      'Penicillin', 'Amoxicillin', 'Metformin', 'Sulfa', 'Aspirin', 'Ibuprofen',
    ]);
    await service.onModuleInit();

    await expect(service.getProof(PATIENT, false)).rejects.toThrow(/6 allergies.*N_max=5/s);
  });

  it('exactly N_MAX allergies is still accepted', async () => {
    const service = makeService(['Penicillin', 'Amoxicillin', 'Metformin', 'Sulfa', 'Aspirin']);
    await service.onModuleInit();

    const proof = await service.getProof(PATIENT, false);
    expect(proof.allergyCount).toBe(5);
    // The zero leaf sits at index 5 — bits 101, little-endian.
    expect(proof.paddingPathBits).toEqual([1, 0, 1]);
  });

  it('the zero-leaf path proves membership at index allergyCount', async () => {
    const service = makeService(['Penicillin', 'Amoxicillin']);
    await service.onModuleInit();
    const proof = await service.getProof(PATIENT, false);

    expect(proof.patientRecordRoot).toBe(EXPECTED.two);
    expect(proof.allergyCount).toBe(2);
    // pathBits are the little-endian bits of the index — what the circuit pins them to.
    expect(proof.paddingPathBits).toEqual([0, 1, 0]);
    expect(proof.paddingSiblings).toHaveLength(3);
  });
});

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';

const MERKLE_DEPTH = 3; // 8 leaves, matches the circuit
const N_MAX = 3;        // active reference slots, matches the circuit

// Substance → 0-based id. MUST match SUBSTANCE_IDX in ehealth-zkp-prover so the
// leaf formula is identical on both sides (shared contract).
const SUBSTANCE_IDX: Record<string, number> = {
  metformin: 0,
  penicillin: 1,
  amoxicillin: 2,
};

export interface PatientRecordProof {
  substances: string[];          // active allergy substance names (for the prover's contraindication step)
  patientRecordRoot: string;
  refLeaf: string[];             // N_MAX leaves (active + zero padding)
  refSiblings: string[][];       // N_MAX × MERKLE_DEPTH
  refPathBits: number[][];       // N_MAX × MERKLE_DEPTH
  refIsActive: number[];         // N_MAX
}

// Builds a per-patient allergy Merkle tree from the DKG graph, on demand.
// Leaf contract (shared with prover + circuit membership):
//   leaf = Poseidon(stringToField(patientId), substanceCode)
//   substanceCode = substanceId + 1 for known substances, else stringToField(name)
@Injectable()
export class PatientRecordService implements OnModuleInit {
  private readonly logger = new Logger(PatientRecordService.name);
  private poseidon: Awaited<ReturnType<typeof buildPoseidon>>;

  constructor(private readonly dkgService: DkgService) {}

  async onModuleInit() {
    this.poseidon = await buildPoseidon();
  }

  private poseidonHash(inputs: bigint[]): bigint {
    return this.poseidon.F.toObject(this.poseidon(inputs));
  }

  // Deterministic string → BN254 field element (same as prover stringToField).
  private stringToField(s: string): bigint {
    const h = createHash('sha256').update(s, 'utf8').digest('hex');
    return BigInt('0x' + h.slice(0, 62));
  }

  // leaf = Poseidon(patientField, substanceCode)
  private leafFor(patientField: bigint, substance: string): bigint {
    const idx = SUBSTANCE_IDX[substance.toLowerCase()];
    const substanceCode = idx !== undefined ? BigInt(idx + 1) : this.stringToField(substance);
    return this.poseidonHash([patientField, substanceCode]);
  }

  // Queries the patient's allergy substances from the DKG graph.
  private async fetchAllergies(patientId: string): Promise<string[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?substance WHERE {
        ?a a rx:Allergy ;
           rx:hasPatient <urn:patient:${patientId}> ;
           rx:hasSubstance ?substance .
      }
    `;
    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      // ?substance comes back as an IRI (rx:Penicillin or full IRI) — take the local name.
      return (Array.isArray(rows) ? rows : [])
        .map((r: any) => String(r.substance ?? ''))
        .map((iri) => iri.split(/[#/:]/).pop() ?? iri)
        .filter((s) => s.length > 0);
    } catch (e: any) {
      this.logger.warn(`Allergy SPARQL lookup failed for ${patientId}: ${e.message}`);
      return [];
    }
  }

  async getProof(patientId: string): Promise<PatientRecordProof> {
    const patientField = this.stringToField(patientId.toLowerCase());
    const allergies = (await this.fetchAllergies(patientId)).slice(0, N_MAX);

    // Active leaves + zero padding up to the tree size.
    const size = 1 << MERKLE_DEPTH;
    const leafValues: bigint[] = [];
    for (let i = 0; i < N_MAX; i++) {
      leafValues.push(i < allergies.length ? this.leafFor(patientField, allergies[i]) : 0n);
    }
    const padded = Array.from({ length: size }, (_, i) => (i < leafValues.length ? leafValues[i] : 0n));

    // Build the Poseidon Merkle tree.
    const tree: bigint[][] = [padded];
    for (let d = 0; d < MERKLE_DEPTH; d++) {
      const cur = tree[d];
      const next: bigint[] = [];
      for (let i = 0; i < cur.length; i += 2) next.push(this.poseidonHash([cur[i], cur[i + 1]]));
      tree.push(next);
    }
    const root = tree[MERKLE_DEPTH][0];

    const refSiblings: string[][] = [];
    const refPathBits: number[][] = [];
    const refIsActive: number[] = [];
    for (let i = 0; i < N_MAX; i++) {
      const active = i < allergies.length ? 1 : 0;
      refIsActive.push(active);
      if (active) {
        const sib: string[] = [];
        const bits: number[] = [];
        let idx = i;
        for (let d = 0; d < MERKLE_DEPTH; d++) {
          const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
          sib.push(tree[d][sibIdx].toString());
          bits.push(idx % 2);
          idx = Math.floor(idx / 2);
        }
        refSiblings.push(sib);
        refPathBits.push(bits);
      } else {
        refSiblings.push(new Array(MERKLE_DEPTH).fill('0'));
        refPathBits.push(new Array(MERKLE_DEPTH).fill(0));
      }
    }

    this.logger.log(`Patient record root for ${patientId}: ${allergies.length} allergies → ${root}`);

    return {
      substances: allergies,
      patientRecordRoot: root.toString(),
      refLeaf: leafValues.map((v) => v.toString()),
      refSiblings,
      refPathBits,
      refIsActive,
    };
  }
}

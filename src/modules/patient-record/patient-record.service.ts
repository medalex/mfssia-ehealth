import { Injectable, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';
import { EvmPublisherService } from '@/modules/evm-publisher/evm-publisher.service';

const MERKLE_DEPTH = 3; // 8 leaves, matches the circuit
const N_MAX = 5;        // active reference slots, matches the circuit

// Substance → 0-based id. MUST match SUBSTANCE_IDX in ehealth-zkp-prover so the
// leaf formula is identical on both sides (shared contract).
const SUBSTANCE_IDX: Record<string, number> = {
  metformin: 0,
  penicillin: 1,
  amoxicillin: 2,
};

export interface PatientRecordProof {
  substances: string[];          // active allergy substance names (for the prover's contraindication step)
  substanceIds: number[];        // active substance ids (for fetching contraindication proofs)
  patientRecordRoot: string;
  refLeaf: string[];             // N_MAX leaves (active + zero padding)
  refSiblings: string[][];       // N_MAX × MERKLE_DEPTH
  refPathBits: number[][];       // N_MAX × MERKLE_DEPTH
  refIsActive: number[];         // N_MAX — kept for callers; the circuit now DERIVES this
  // Allergy-count commitment. The circuit derives refIsActive[i] = (i < allergyCount) and
  // proves the ZERO leaf is a member of patientRecordRoot at index allergyCount, with the
  // path pinned to the index. That turns "how many allergies does this patient have" into a
  // committed fact, so a prover can no longer mark every slot inactive and skip them all.
  allergyCount: number;
  paddingSiblings: string[];     // MERKLE_DEPTH — membership path of the zero leaf
  paddingPathBits: number[];     // MERKLE_DEPTH — little-endian bits of allergyCount
}

// Builds a per-patient allergy Merkle tree from the DKG graph, on demand.
// Leaf contract (shared with prover + circuit membership):
//   leaf = Poseidon(stringToField(patientId), substanceCode)
//   substanceCode = substanceId + 1 for known substances, else stringToField(name)
@Injectable()
export class PatientRecordService implements OnModuleInit {
  private readonly logger = new Logger(PatientRecordService.name);
  private poseidon: Awaited<ReturnType<typeof buildPoseidon>>;

  constructor(
    private readonly dkgService: DkgService,
    private readonly evm: EvmPublisherService,
  ) {}

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

  // Every patient that currently has at least one allergy in the DKG graph.
  private async fetchPatientsWithAllergies(): Promise<string[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT DISTINCT ?patient WHERE {
        ?a a rx:Allergy ;
           rx:hasPatient ?patient .
      }
    `;
    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      return (Array.isArray(rows) ? rows : [])
        .map((r: any) => String(r.patient ?? '').replace(/^urn:patient:/, '').trim())
        .filter((id) => id.length > 0);
    } catch (e: any) {
      this.logger.warn(`Patient enumeration failed: ${e.message}`);
      return [];
    }
  }

  // The root of an all-zero tree — the record of every patient with no allergies. Included
  // unconditionally: such patients never appear in the SPARQL enumeration above, but their
  // proofs still carry this root and must be accepted.
  emptyRoot(): string {
    let level: bigint[] = new Array(1 << MERKLE_DEPTH).fill(0n);
    for (let d = 0; d < MERKLE_DEPTH; d++) {
      const next: bigint[] = [];
      for (let i = 0; i < level.length; i += 2) next.push(this.poseidonHash([level[i], level[i + 1]]));
      level = next;
    }
    return level[0].toString();
  }

  // The set of patientRecordRoots currently committed in the DKG. Pushed to the verifier as
  // the CLASS B membership set — a proof against any other root is rejected.
  async listRoots(): Promise<string[]> {
    const patients = await this.fetchPatientsWithAllergies();
    const roots = new Set<string>([this.emptyRoot()]);
    for (const id of patients) {
      try {
        // publish=false: listRoots is itself the input to a bulk replace.
        roots.add((await this.getProof(id, false)).patientRecordRoot);
      } catch (e: any) {
        // One over-capacity patient must not stop the whole set from being published. That
        // patient has no committable root, so omitting it is correct AND fail-closed: any
        // proof they somehow produce is rejected as an unknown record root.
        this.logger.error(`Excluding patient ${id} from the published root set: ${e.message}`);
      }
    }
    return [...roots];
  }

  // `publish` keeps the verifier's CLASS B set in step with the record the prover is about
  // to use. Allergies are written by patient-api straight into the DKG, so mfssia never sees
  // the change — serving a proof is the moment the new root becomes relevant.
  async getProof(patientId: string, publish = true): Promise<PatientRecordProof> {
    const patientField = this.stringToField(patientId.toLowerCase());
    const allergies = await this.fetchAllergies(patientId);

    // No truncation. Slicing to N_MAX would commit a root covering only the first N_MAX
    // allergies, and the circuit would then honestly prove "no allergy at or above
    // allergyCount" of a tree that already dropped the rest — the completeness guarantee
    // would hold over an incomplete record, which is worse than no guarantee.
    if (allergies.length > N_MAX) {
      throw new ServiceUnavailableException(
        `patient ${patientId} has ${allergies.length} allergies but the circuit has only ` +
        `N_max=${N_MAX} reference slots. Committing a root over the first ${N_MAX} would ` +
        `silently drop the remaining ${allergies.length - N_MAX}, so no patient-record root is ` +
        `produced. Recompile the circuit with a larger N_max and redo the trusted setup.`,
      );
    }

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

    // Membership path of the zero leaf at index allergyCount, read off the SAME tree, so the
    // path and the root are consistent by construction. pathBits are the little-endian bits
    // of the index — which is exactly what the circuit checks them against.
    const paddingSiblings: string[] = [];
    const paddingPathBits: number[] = [];
    let padIdx = allergies.length;
    for (let d = 0; d < MERKLE_DEPTH; d++) {
      const sibIdx = padIdx % 2 === 0 ? padIdx + 1 : padIdx - 1;
      paddingSiblings.push(tree[d][sibIdx].toString());
      paddingPathBits.push(padIdx % 2);
      padIdx = Math.floor(padIdx / 2);
    }

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
    if (publish) await this.evm.addRootBestEffort('patient', root.toString());

    return {
      substances: allergies,
      substanceIds: allergies.map((s) => SUBSTANCE_IDX[s.toLowerCase()] ?? -1),
      patientRecordRoot: root.toString(),
      refLeaf: leafValues.map((v) => v.toString()),
      refSiblings,
      refPathBits,
      refIsActive,
      allergyCount: allergies.length,
      paddingSiblings,
      paddingPathBits,
    };
  }
}

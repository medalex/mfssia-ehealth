import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';

const CONTRA_DEPTH = 4; // 16 leaves; holds the N_SUBST × N_DRUGS pairs
const N_DRUGS = 3;      // Metformin=0, Penicillin=1, Amoxicillin=2

// Materialized contraindication closure (governance-approved subsumption, paper §III).
// CONTRA[substanceId][drugId] = 1 if an allergy to the substance contraindicates the drug.
// β-lactam cross-reactivity: Penicillin allergy ⟹ Penicillin + Amoxicillin contraindicated.
const CONTRA: number[][] = [
  /* Metformin(0)   */ [1, 0, 0],
  /* Penicillin(1)  */ [0, 1, 1],
  /* Amoxicillin(2) */ [0, 1, 1],
];

export interface ContraindicationProof {
  substanceId: number;
  drugId: number;
  value: number;
  siblings: string[];
  pathBits: number[];
  contraindicationRoot: string;
}

// Publishes the contraindication closure as a Poseidon Merkle tree anchored in DKG and
// serves membership proofs. Each leaf = Poseidon(substanceId, drugId, value), so a prover
// cannot fake a contraindication value — only the committed value's leaf is in the tree.
@Injectable()
export class ContraindicationService implements OnModuleInit {
  private readonly logger = new Logger(ContraindicationService.name);
  private poseidon: Awaited<ReturnType<typeof buildPoseidon>>;
  private tree: bigint[][] = [];
  private root = 0n;
  private dkgUal: string | null = null;

  constructor(private readonly dkgService: DkgService) {}

  async onModuleInit() {
    this.poseidon = await buildPoseidon();

    // Leaf index = substanceId * N_DRUGS + drugId.
    const size = 1 << CONTRA_DEPTH;
    const leaves: bigint[] = Array.from({ length: size }, () => 0n);
    for (let s = 0; s < N_DRUGS; s++) {
      for (let d = 0; d < N_DRUGS; d++) {
        leaves[s * N_DRUGS + d] = this.leafFor(s, d, CONTRA[s][d]);
      }
    }

    this.tree = [leaves];
    for (let depth = 0; depth < CONTRA_DEPTH; depth++) {
      const cur = this.tree[depth];
      const next: bigint[] = [];
      for (let i = 0; i < cur.length; i += 2) next.push(this.poseidonHash([cur[i], cur[i + 1]]));
      this.tree.push(next);
    }
    this.root = this.tree[CONTRA_DEPTH][0];

    this.logger.log(`Contraindication closure tree built: root=${this.root}`);
    await this.publishRootToDkg();
  }

  private poseidonHash(inputs: bigint[]): bigint {
    return this.poseidon.F.toObject(this.poseidon(inputs));
  }

  // leaf = Poseidon(substanceId, drugId, value)
  private leafFor(substanceId: number, drugId: number, value: number): bigint {
    return this.poseidonHash([BigInt(substanceId), BigInt(drugId), BigInt(value)]);
  }

  getRoot(): string {
    return this.root.toString();
  }

  getProof(substanceId: number, drugId: number): ContraindicationProof {
    if (substanceId < 0 || substanceId >= N_DRUGS || drugId < 0 || drugId >= N_DRUGS) {
      throw new NotFoundException(`No contraindication leaf for (${substanceId}, ${drugId})`);
    }
    const value = CONTRA[substanceId][drugId];
    const siblings: string[] = [];
    const pathBits: number[] = [];
    let idx = substanceId * N_DRUGS + drugId;
    for (let d = 0; d < CONTRA_DEPTH; d++) {
      const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      siblings.push(this.tree[d][sibIdx].toString());
      pathBits.push(idx % 2);
      idx = Math.floor(idx / 2);
    }
    return {
      substanceId,
      drugId,
      value,
      siblings,
      pathBits,
      contraindicationRoot: this.root.toString(),
    };
  }

  // Publishes the closure root to DKG (idempotent — skips if already present).
  private async publishRootToDkg(): Promise<void> {
    const rootStr = this.root.toString();
    try {
      const sparql = `
        PREFIX mfssia: <https://mfssia.io/ontology/prescription#>
        SELECT ?s WHERE {
          ?s a mfssia:ContraindicationClosure ;
             mfssia:merkleRoot "${rootStr}" .
        }
      `;
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      if (Array.isArray(rows) && rows.length > 0) {
        this.logger.log('Contraindication closure root already in DKG — skipping publish');
        return;
      }
    } catch (e: any) {
      this.logger.warn(`DKG check failed, will attempt publish: ${e.message}`);
    }

    try {
      const asset = {
        '@context': {
          mfssia: 'https://mfssia.io/ontology/prescription#',
        },
        '@type': 'mfssia:ContraindicationClosure',
        '@id': 'urn:mfssia:contraindication-closure:v1',
        'mfssia:merkleRoot': rootStr,
        'mfssia:merkleDepth': CONTRA_DEPTH,
        'mfssia:publishedAt': new Date().toISOString(),
      };
      const response = await this.dkgService.createAsset(asset as any);
      this.dkgUal = response.UAL;
      this.logger.log(`Contraindication closure root published to DKG: UAL=${this.dkgUal}`);
    } catch (e: any) {
      this.logger.warn(`Failed to publish contraindication closure to DKG: ${e.message}`);
    }
  }
}

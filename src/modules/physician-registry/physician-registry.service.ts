import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';

const MERKLE_DEPTH = 3; // 8 leaves, matches the circuit

// Deterministic hash: SHA256(licenseNumber), first 31 bytes → BN254 field element.
// Same formula as stringToField in ehealth-zkp-prover.
function computeCredentialHash(licenseNumber: string): bigint {
  const h = createHash('sha256').update(licenseNumber, 'utf8').digest('hex');
  return BigInt('0x' + h.slice(0, 62));
}

export interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  credentialHash: string;
}

export interface MerkleProof {
  credentialHash: string;
  siblings: string[];
  pathBits: number[];
}

// Licensed physician registry — source of truth for ZKP credential verification.
// IDs match those seeded in ehealth-hospital-api (Seeder.cs).
const PHYSICIAN_REGISTRY_SEED = [
  { id: '00000000-0000-0000-0002-000000000001', firstName: 'James',   lastName: 'Wilson',  specialty: 'General Practitioner', licenseNumber: 'MED-LIC-2024-001' },
  { id: '00000000-0000-0000-0002-000000000002', firstName: 'Sarah',   lastName: 'Chen',    specialty: 'Endocrinologist',      licenseNumber: 'MED-LIC-2024-002' },
  { id: '00000000-0000-0000-0002-000000000003', firstName: 'Michael', lastName: 'Roberts', specialty: 'Pulmonologist',        licenseNumber: 'MED-LIC-2024-003' },
];

@Injectable()
export class PhysicianRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PhysicianRegistryService.name);

  private poseidon: Awaited<ReturnType<typeof buildPoseidon>>;
  private physicians: Physician[] = [];
  private merkleTree: bigint[][] = [];
  private merkleRoot: bigint = 0n;
  private dkgUal: string | null = null;

  constructor(private readonly dkgService: DkgService) {}

  async onModuleInit() {
    this.poseidon = await buildPoseidon();

    // Build physician list with credential hashes
    this.physicians = PHYSICIAN_REGISTRY_SEED.map((p) => ({
      ...p,
      credentialHash: computeCredentialHash(p.licenseNumber).toString(),
    }));

    // Build Poseidon Merkle tree of depth 3 (8 leaves)
    const size = 1 << MERKLE_DEPTH;
    const leaves: bigint[] = Array.from({ length: size }, (_, i) =>
      i < this.physicians.length ? BigInt(this.physicians[i].credentialHash) : 0n,
    );

    this.merkleTree = [leaves];
    for (let d = 0; d < MERKLE_DEPTH; d++) {
      const cur = this.merkleTree[d];
      const next: bigint[] = [];
      for (let i = 0; i < cur.length; i += 2) {
        next.push(this.poseidonHash([cur[i], cur[i + 1]]));
      }
      this.merkleTree.push(next);
    }
    this.merkleRoot = this.merkleTree[MERKLE_DEPTH][0];

    this.logger.log(`Physician registry built: ${this.physicians.length} doctors, root=${this.merkleRoot}`);

    // Publish root to DKG (idempotent: check before writing)
    await this.publishRootToDkg();
  }

  private poseidonHash(inputs: bigint[]): bigint {
    return this.poseidon.F.toObject(this.poseidon(inputs));
  }

  // Publishes the Merkle root to DKG; skips on container restart if already present
  private async publishRootToDkg(): Promise<void> {
    const rootStr = this.merkleRoot.toString();

    // Check whether this root is already in DKG
    try {
      const sparql = `
        PREFIX mfssia: <https://mfssia.io/ontology/prescription#>
        SELECT ?ual WHERE {
          ?s a mfssia:PhysicianRegistry ;
             mfssia:merkleRoot "${rootStr}" .
        }
      `;
      const result = await this.dkgService.findAssets(sparql) as any;
      const rows = result?.data ?? result ?? [];
      if (Array.isArray(rows) && rows.length > 0) {
        this.logger.log(`Physician registry root already in DKG — skipping publish`);
        return;
      }
    } catch (e: any) {
      this.logger.warn(`DKG check failed, will attempt publish: ${e.message}`);
    }

    // Publish physician registry root as a JSON-LD asset
    try {
      const asset = {
        '@context': {
          mfssia: 'https://mfssia.io/ontology/prescription#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
        '@type': 'mfssia:PhysicianRegistry',
        '@id': 'urn:mfssia:physician-registry:v1',
        'mfssia:merkleRoot': rootStr,
        'mfssia:physiciansCount': this.physicians.length,
        'mfssia:merkleDepth': MERKLE_DEPTH,
        'mfssia:publishedAt': new Date().toISOString(),
      };

      const response = await this.dkgService.createAsset(asset as any);
      this.dkgUal = response.UAL;
      this.logger.log(`Physician registry root published to DKG: UAL=${this.dkgUal}`);
    } catch (e: any) {
      this.logger.warn(`Failed to publish physician registry to DKG: ${e.message}`);
    }
  }

  getMerkleRoot(): string {
    return this.merkleRoot.toString();
  }

  getDkgUal(): string | null {
    return this.dkgUal;
  }

  findAll(): Physician[] {
    return this.physicians;
  }

  findById(id: string): Physician {
    const physician = this.physicians.find(
      (p) => p.id.toLowerCase() === id.toLowerCase(),
    );
    if (!physician) {
      throw new NotFoundException(`Physician ${id} not found in MFSSIA registry`);
    }
    return physician;
  }

  getMerkleProof(id: string): MerkleProof {
    const idx = this.physicians.findIndex(
      (p) => p.id.toLowerCase() === id.toLowerCase(),
    );
    if (idx < 0) {
      throw new NotFoundException(`Physician ${id} not found in MFSSIA registry`);
    }

    const siblings: string[] = [];
    const pathBits: number[] = [];
    let cur = idx;
    for (let d = 0; d < MERKLE_DEPTH; d++) {
      const sibIdx = cur % 2 === 0 ? cur + 1 : cur - 1;
      siblings.push(this.merkleTree[d][sibIdx].toString());
      pathBits.push(cur % 2);
      cur = Math.floor(cur / 2);
    }

    return {
      credentialHash: this.physicians[idx].credentialHash,
      siblings,
      pathBits,
    };
  }
}

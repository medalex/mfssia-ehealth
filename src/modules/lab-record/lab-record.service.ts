import { Injectable, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';
import { EvmPublisherService } from '@/modules/evm-publisher/evm-publisher.service';

const LAB_DEPTH = 3; // 8 leaves; matches the circuit

export interface LabMeasurement {
  metric: string;
  metricId: string;        // stringToField(metric) — used in the leaf
  value: number;
  unit: string;            // reporting unit (from the lab) — used for numeric-conflict detection
  measuredBy?: string;     // reporting lab — so a conflict can name the two sources
  measuredAt: string | null;
  siblings: string[];      // LAB_DEPTH membership siblings
  pathBits: number[];      // LAB_DEPTH membership path bits
}

export interface LabRecordProof {
  labRecordRoot: string;
  measurements: LabMeasurement[];
}

// Builds a per-patient lab-record Poseidon Merkle tree from the DKG graph (rx:LabResult),
// so the lab value the ZKP consumes is bound to the committed record.
// Leaf contract (shared with prover + circuit):
//   leaf = Poseidon(stringToField(patientId), stringToField(metric), floor(value))
@Injectable()
export class LabRecordService implements OnModuleInit {
  private readonly logger = new Logger(LabRecordService.name);
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

  private stringToField(s: string): bigint {
    const h = createHash('sha256').update(s, 'utf8').digest('hex');
    return BigInt('0x' + h.slice(0, 62));
  }

  // Strips RDF-typed literals: "\"45\"^^xsd:decimal" → "45", "\"eGFR\"" → "eGFR".
  private clean(v: string): string {
    return String(v ?? '').replace(/\^\^.*$/, '').replace(/^"|"$/g, '');
  }

  private async fetchRaw(
    patientId: string,
  ): Promise<{ metric: string; value: number; unit: string; measuredBy: string; measuredAt: string | null }[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?metric ?value ?unit ?src ?ts WHERE {
        ?l a rx:LabResult ;
           rx:hasPatient <urn:patient:${patientId}> ;
           rx:hasMetric ?metric ;
           rx:hasValue ?value .
        OPTIONAL { ?l rx:hasUnit ?unit }
        OPTIONAL { ?l rx:hasSource ?src }
        OPTIONAL { ?l rx:hasTimestamp ?ts }
      }
    `;
    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      return (Array.isArray(rows) ? rows : [])
        .map((r: any) => ({
          metric: this.clean(r.metric),
          value: Number(this.clean(r.value)),
          unit: this.clean(r.unit),
          // hasSource is an IRI like urn:org:lab-a — take the slug after the last ':'.
          measuredBy: this.clean(r.src).split(':').pop() ?? '',
          measuredAt: r.ts ? this.clean(r.ts) : null,
        }))
        .filter((m) => m.metric.length > 0 && Number.isFinite(m.value));
    } catch (e: any) {
      this.logger.warn(`Lab SPARQL lookup failed for ${patientId}: ${e.message}`);
      return [];
    }
  }

  // Every patient that currently has at least one lab result in the DKG graph.
  private async fetchPatientsWithLabResults(): Promise<string[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT DISTINCT ?patient WHERE {
        ?l a rx:LabResult ;
           rx:hasPatient ?patient .
      }
    `;
    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      return (Array.isArray(rows) ? rows : [])
        .map((r: any) => this.clean(String(r.patient ?? '')).replace(/^urn:patient:/, '').trim())
        .filter((id) => id.length > 0);
    } catch (e: any) {
      this.logger.warn(`Lab patient enumeration failed: ${e.message}`);
      return [];
    }
  }

  // Root of an all-zero tree — the lab record of every patient with no measurements.
  emptyRoot(): string {
    let level: bigint[] = new Array(1 << LAB_DEPTH).fill(0n);
    for (let d = 0; d < LAB_DEPTH; d++) {
      const next: bigint[] = [];
      for (let i = 0; i < level.length; i += 2) next.push(this.poseidonHash([level[i], level[i + 1]]));
      level = next;
    }
    return level[0].toString();
  }

  // The set of labRecordRoots currently committed in the DKG (CLASS B membership set).
  async listRoots(): Promise<string[]> {
    const patients = await this.fetchPatientsWithLabResults();
    const roots = new Set<string>([this.emptyRoot()]);
    for (const id of patients) {
      try {
        roots.add((await this.getProof(id, false)).labRecordRoot);
      } catch (e: any) {
        this.logger.error(`Excluding patient ${id} from the published lab-root set: ${e.message}`);
      }
    }
    return [...roots];
  }

  // See PatientRecordService.getProof — lab results are written by lab-api into the DKG, so
  // serving the proof is where the new root gets published to the verifier.
  async getProof(patientId: string, publish = true): Promise<LabRecordProof> {
    const patientField = this.stringToField(patientId.toLowerCase());
    const raw = await this.fetchRaw(patientId);

    const size = 1 << LAB_DEPTH;

    // Same truncation, implicit here: the leaf array is built to tree capacity, so anything
    // past 2^LAB_DEPTH never reaches the root, and the membership walk below then runs off
    // the end of the tree with a TypeError. The consequence is milder than for allergies —
    // a dropped measurement is one that cannot be proved, so it is fail-closed rather than a
    // soundness hole — but it should say so instead of committing a partial root.
    if (raw.length > size) {
      throw new ServiceUnavailableException(
        `patient ${patientId} has ${raw.length} lab measurements but the lab-record tree holds ` +
        `only ${size} leaves (LAB_DEPTH=${LAB_DEPTH}). Committing a root over the first ${size} ` +
        `would drop the remaining ${raw.length - size}, so no lab-record root is produced. ` +
        `Recompile the circuit with a larger LAB_DEPTH and redo the trusted setup.`,
      );
    }

    const metricIds = raw.map((m) => this.stringToField(m.metric.toLowerCase().trim()));
    const values = raw.map((m) => BigInt(Math.floor(m.value)));
    const leaves: bigint[] = Array.from({ length: size }, (_, i) =>
      i < raw.length ? this.poseidonHash([patientField, metricIds[i], values[i]]) : 0n,
    );

    const tree: bigint[][] = [leaves];
    for (let d = 0; d < LAB_DEPTH; d++) {
      const cur = tree[d];
      const next: bigint[] = [];
      for (let i = 0; i < cur.length; i += 2) next.push(this.poseidonHash([cur[i], cur[i + 1]]));
      tree.push(next);
    }
    const root = tree[LAB_DEPTH][0];

    const measurements: LabMeasurement[] = raw.map((m, i) => {
      const siblings: string[] = [];
      const pathBits: number[] = [];
      let idx = i;
      for (let d = 0; d < LAB_DEPTH; d++) {
        const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
        siblings.push(tree[d][sibIdx].toString());
        pathBits.push(idx % 2);
        idx = Math.floor(idx / 2);
      }
      return {
        metric: m.metric,
        metricId: metricIds[i].toString(),
        value: Math.floor(m.value),
        unit: m.unit,
        measuredBy: m.measuredBy,
        measuredAt: m.measuredAt,
        siblings,
        pathBits,
      };
    });

    this.logger.log(`Lab record root for ${patientId}: ${raw.length} measurements → ${root}`);
    if (publish) await this.evm.addRootBestEffort('lab', root.toString());
    return { labRecordRoot: root.toString(), measurements };
  }
}

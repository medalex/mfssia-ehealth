import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { DkgService } from '@/providers/dkg/dkg.service';

const LAB_DEPTH = 3; // 8 leaves; matches the circuit

export interface LabMeasurement {
  metric: string;
  metricId: string;        // stringToField(metric) — used in the leaf
  value: number;
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

  constructor(private readonly dkgService: DkgService) {}

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

  private async fetchRaw(patientId: string): Promise<{ metric: string; value: number; measuredAt: string | null }[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?metric ?value ?ts WHERE {
        ?l a rx:LabResult ;
           rx:hasPatient <urn:patient:${patientId}> ;
           rx:hasMetric ?metric ;
           rx:hasValue ?value .
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
          measuredAt: r.ts ? this.clean(r.ts) : null,
        }))
        .filter((m) => m.metric.length > 0 && Number.isFinite(m.value));
    } catch (e: any) {
      this.logger.warn(`Lab SPARQL lookup failed for ${patientId}: ${e.message}`);
      return [];
    }
  }

  async getProof(patientId: string): Promise<LabRecordProof> {
    const patientField = this.stringToField(patientId.toLowerCase());
    const raw = await this.fetchRaw(patientId);

    const size = 1 << LAB_DEPTH;
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
        measuredAt: m.measuredAt,
        siblings,
        pathBits,
      };
    });

    this.logger.log(`Lab record root for ${patientId}: ${raw.length} measurements → ${root}`);
    return { labRecordRoot: root.toString(), measurements };
  }
}

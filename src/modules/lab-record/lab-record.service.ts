import { Injectable, Logger } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';

export interface LabMeasurement {
  metric: string;
  value: number;
  measuredAt: string | null;
}

// Reads a patient's lab measurements from the DKG graph (rx:LabResult). This makes
// the lab value the prover uses come from a queryable, accredited DKG source instead
// of a direct lab-api call.
@Injectable()
export class LabRecordService {
  private readonly logger = new Logger(LabRecordService.name);

  constructor(private readonly dkgService: DkgService) {}

  // Strips RDF-typed literals: "\"45\"^^xsd:decimal" → "45", "\"eGFR\"" → "eGFR".
  private clean(v: string): string {
    return String(v ?? '').replace(/\^\^.*$/, '').replace(/^"|"$/g, '');
  }

  async getResults(patientId: string): Promise<LabMeasurement[]> {
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
}

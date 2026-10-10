import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';

const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const PATIENT_ID = '00000000-0000-0000-0000-000000000001';
const PATIENT_IRI = `urn:patient:${PATIENT_ID}`;

@Injectable()
export class PilotDemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(PilotDemoSeedService.name);

  constructor(private readonly dkg: DkgService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.PILOT_DEMO_SEED !== 'true') return;

    try {
      await this.ensureConsent('hospital-1');
      await this.ensureConsent('lab-a');
      await this.ensureLabResult('lab-a', '45', '2025-10-10T08:00:00.000Z');
      await this.ensureLabResult('lab-b', '20', '2026-10-03T08:00:00.000Z');
      this.logger.log('Pilot demo evidence is present in DKG');
    } catch (error: any) {
      this.logger.error(`Pilot demo seed failed: ${error.message}`);
    }
  }

  private async rows(query: string): Promise<any[]> {
    const result = (await this.dkg.findAssets(query)) as any;
    const rows = result?.data ?? result;
    if (!Array.isArray(rows)) throw new Error('Unexpected DKG SPARQL response');
    return rows;
  }

  private async ensureConsent(custodianId: string): Promise<void> {
    const query = `
      PREFIX rx: <${RX}>
      SELECT ?c WHERE {
        ?c a rx:DataSharingConsent ;
           rx:patient "${PATIENT_ID}" ;
           rx:consentCovers "hospital-1" ;
           rx:consentCoversCustodian "${custodianId}" .
      }
    `;
    if ((await this.rows(query)).length > 0) return;

    await this.dkg.createAsset({
      '@context': { rx: RX, xsd: XSD },
      '@id': `urn:consent:pilot-${PATIENT_ID}-${custodianId}`,
      '@type': 'rx:DataSharingConsent',
      'rx:patient': PATIENT_ID,
      'rx:consentCovers': 'hospital-1',
      'rx:consentCoversCustodian': custodianId,
      'rx:grantedAt': { '@value': new Date().toISOString(), '@type': 'xsd:dateTime' },
      'rx:validUntil': { '@value': '2126-10-10T00:00:00.000Z', '@type': 'xsd:dateTime' },
    } as any);
  }

  private async ensureLabResult(custodianId: string, value: string, measuredAt: string): Promise<void> {
    const assetId = `urn:lab-result:pilot-${PATIENT_ID}-${custodianId}-egfr`;
    const query = `
      PREFIX rx: <${RX}>
      SELECT ?result WHERE {
        ?result a rx:LabResult ;
                rx:hasPatient <${PATIENT_IRI}> ;
                rx:hasSource <urn:org:${custodianId}> ;
                rx:hasMetric "eGFR" .
      }
    `;
    if ((await this.rows(query)).length > 0) return;

    await this.dkg.createAsset({
      '@context': { rx: RX, xsd: XSD },
      '@id': assetId,
      '@type': 'rx:LabResult',
      'rx:hasPatient': { '@id': PATIENT_IRI },
      'rx:hasMetric': 'eGFR',
      'rx:hasValue': { '@value': value, '@type': 'xsd:decimal' },
      'rx:hasUnit': 'mL/min/1.73m2',
      'rx:hasSource': { '@id': `urn:org:${custodianId}` },
      'rx:hasTimestamp': { '@value': measuredAt, '@type': 'xsd:dateTime' },
    } as any);
  }
}
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DkgService } from '@/providers/dkg/dkg.service';

const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const PATIENT_ID = '00000000-0000-0000-0000-000000000001';
const PATIENT_IRI = `urn:patient:${PATIENT_ID}`;

@Injectable()
export class PilotDemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(PilotDemoSeedService.name);

  constructor(
    private readonly dkg: DkgService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.PILOT_DEMO_SEED !== 'true') return;

    const referenceTime = this.config.get<string>('app.evidenceReferenceTime');
    const rootTime = referenceTime ? new Date(referenceTime) : new Date();
    if (!referenceTime) {
      this.logger.warn('PILOT_DEMO_SEED=true but EVIDENCE_REFERENCE_TIME is unset; seeded dates will depend on the current system clock.');
    }

    try {
      await this.ensureConsent('hospital-1');
      await this.ensureConsent('lab-a');
      await this.ensureLabResult('lab-a', '45', new Date(rootTime.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString());
      await this.ensureLabResult('lab-b', '20', new Date(rootTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
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
    // Idempotent seed: if a record already exists for the current patient + custodian, we do not overwrite it.
    // To reseed, change the suffix below (for example: urn:lab-result:pilot-...-egfr-v2) or remove the old asset from DKG first.
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
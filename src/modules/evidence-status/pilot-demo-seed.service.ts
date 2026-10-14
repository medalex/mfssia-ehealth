import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DkgService } from '@/providers/dkg/dkg.service';
import { ClockService } from '@/shared/clock/clock.service';
import { PILOT_ORGANIZATION_ID, PILOT_SCENARIOS } from './pilot-scenarios';

const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

@Injectable()
export class PilotDemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(PilotDemoSeedService.name);

  constructor(
    private readonly dkg: DkgService,
    private readonly config: ConfigService,
    private readonly clock: ClockService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.PILOT_DEMO_SEED !== 'true') return;

    const rootTime = this.clock.now();
    if (!this.config.get<string>('app.evidenceReferenceTime')) {
      this.logger.warn('PILOT_DEMO_SEED=true but EVIDENCE_REFERENCE_TIME is unset; seeded dates will depend on the current system clock.');
    }

    try {
      for (const scenario of PILOT_SCENARIOS) {
        for (const custodianId of scenario.consentCustodians) {
          await this.ensureConsent(scenario.patientId, custodianId);
        }

        if (scenario.allergy) {
          await this.ensureAllergy(scenario.patientId, scenario.allergy.substance);
        }

        for (const entry of scenario.labResults) {
          const measuredAt = new Date(rootTime.getTime() + entry.offsetDays * 86400000).toISOString();
          await this.ensureLabResult(scenario.patientId, entry.custodianId, entry.value, measuredAt);
        }
      }
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

  private async ensureConsent(patientId: string, custodianId: string): Promise<void> {
    const query = `
      PREFIX rx: <${RX}>
      SELECT ?c WHERE {
        ?c a rx:DataSharingConsent ;
           rx:patient "${patientId}" ;
           rx:consentCovers "${PILOT_ORGANIZATION_ID}" ;
           rx:consentCoversCustodian "${custodianId}" .
      }
    `;
    if ((await this.rows(query)).length > 0) return;

    await this.dkg.createAsset({
      '@context': { rx: RX, xsd: XSD },
      '@id': `urn:consent:pilot-${patientId}-${custodianId}`,
      '@type': 'rx:DataSharingConsent',
      'rx:patient': patientId,
      'rx:consentCovers': PILOT_ORGANIZATION_ID,
      'rx:consentCoversCustodian': custodianId,
      'rx:grantedAt': { '@value': new Date().toISOString(), '@type': 'xsd:dateTime' },
      'rx:validUntil': { '@value': '2126-10-10T00:00:00.000Z', '@type': 'xsd:dateTime' },
    } as any);
  }

  private async ensureAllergy(patientId: string, substance: string): Promise<void> {
    const query = `
      PREFIX rx: <${RX}>
      SELECT ?a WHERE {
        ?a a rx:Allergy ;
           rx:hasPatient <urn:patient:${patientId}> ;
           rx:hasSubstance rx:${substance} .
      }
    `;
    if ((await this.rows(query)).length > 0) return;

    await this.dkg.createAsset({
      '@context': { rx: RX },
      '@id': `urn:allergy:pilot-${patientId}-${substance}`,
      '@type': 'rx:Allergy',
      'rx:hasPatient': { '@id': `urn:patient:${patientId}` },
      'rx:hasSubstance': { '@id': `${RX}${substance}` },
    } as any);
  }

  private async ensureLabResult(patientId: string, custodianId: string, value: string, measuredAt: string): Promise<void> {
    const assetId = `urn:lab-result:pilot-${patientId}-${custodianId}-egfr`;
    const patientIri = `urn:patient:${patientId}`;
    const query = `
      PREFIX rx: <${RX}>
      SELECT ?result WHERE {
        ?result a rx:LabResult ;
                rx:hasPatient <${patientIri}> ;
                rx:hasSource <urn:org:${custodianId}> ;
                rx:hasMetric "eGFR" .
      }
    `;
    if ((await this.rows(query)).length > 0) return;

    await this.dkg.createAsset({
      '@context': { rx: RX, xsd: XSD },
      '@id': assetId,
      '@type': 'rx:LabResult',
      'rx:hasPatient': { '@id': patientIri },
      'rx:hasMetric': 'eGFR',
      'rx:hasValue': { '@value': value, '@type': 'xsd:decimal' },
      'rx:hasUnit': 'mL/min/1.73m2',
      'rx:hasSource': { '@id': `urn:org:${custodianId}` },
      'rx:hasTimestamp': { '@value': measuredAt, '@type': 'xsd:dateTime' },
    } as any);
  }
}

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ClockService } from '@/shared/clock/clock.service';
import { PilotDemoSeedService } from './pilot-demo-seed.service';

const P1 = '00000000-0000-0000-0000-000000000001';
const P2 = '00000000-0000-0000-0000-000000000002';
const P3 = '00000000-0000-0000-0000-000000000003';
const P4 = '00000000-0000-0000-0000-000000000004';
const REFERENCE_TIME = '2026-10-10T00:00:00Z';

describe('PilotDemoSeedService', () => {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env.PILOT_DEMO_SEED;
    process.env.PILOT_DEMO_SEED = 'true';
  });

  afterEach(() => {
    process.env.PILOT_DEMO_SEED = previous;
  });

  const runSeed = async (existing: boolean) => {
    const createAsset = jest.fn(async (_asset: Record<string, unknown>) => ({ UAL: 'ual:demo' }));
    const findAssets = jest.fn(async (_query: string) => ({ data: existing ? [{ c: 'urn:existing' }] : [] }));
    const config = { get: jest.fn((key: string) => (key === 'app.evidenceReferenceTime' ? REFERENCE_TIME : undefined)) } as any;
    const service = new PilotDemoSeedService({ findAssets, createAsset } as any, config, new ClockService(config));
    await service.onModuleInit();
    return createAsset.mock.calls.map(([asset]) => asset as any);
  };

  it('publishes the pilot scenario consents, the P3 allergy and lab evidence dated from the reference time', async () => {
    const assets = await runSeed(false);

    const consents = assets
      .filter((asset) => asset['@type'] === 'rx:DataSharingConsent')
      .map((asset) => `${asset['rx:patient']}|${asset['rx:consentCovers']}|${asset['rx:consentCoversCustodian']}`)
      .sort();
    expect(consents).toEqual([
      `${P1}|hospital-1|hospital-1`, `${P1}|hospital-1|lab-a`, `${P1}|hospital-1|lab-b`,
      `${P2}|hospital-1|hospital-1`, `${P2}|hospital-1|lab-a`,
      `${P3}|hospital-1|hospital-1`, `${P3}|hospital-1|lab-a`, `${P3}|hospital-1|lab-b`,
      `${P4}|hospital-1|lab-a`, `${P4}|hospital-1|lab-b`,
    ].sort());
    expect(consents).not.toContain(`${P2}|hospital-1|lab-b`);
    expect(consents).not.toContain(`${P4}|hospital-1|hospital-1`);

    const allergies = assets.filter((asset) => asset['@type'] === 'rx:Allergy');
    expect(allergies).toEqual([expect.objectContaining({
      'rx:hasPatient': { '@id': `urn:patient:${P3}` },
      'rx:hasSubstance': { '@id': 'https://mfssia.io/ontology/prescription#Penicillin' },
    })]);

    const labs = assets
      .filter((asset) => asset['@type'] === 'rx:LabResult')
      .map((asset) => [asset['rx:hasPatient']['@id'], asset['rx:hasSource']['@id'], asset['rx:hasValue']['@value'], asset['rx:hasTimestamp']['@value']]);
    expect(labs).toEqual([
      [`urn:patient:${P1}`, 'urn:org:lab-a', '45', '2026-09-10T00:00:00.000Z'],
      [`urn:patient:${P1}`, 'urn:org:lab-b', '20', '2026-10-03T00:00:00.000Z'],
      [`urn:patient:${P2}`, 'urn:org:lab-a', '45', '2026-09-10T00:00:00.000Z'],
      [`urn:patient:${P2}`, 'urn:org:lab-b', '20', '2026-10-03T00:00:00.000Z'],
      [`urn:patient:${P3}`, 'urn:org:lab-a', '60', '2026-10-03T00:00:00.000Z'],
      [`urn:patient:${P4}`, 'urn:org:lab-a', '60', '2026-10-03T00:00:00.000Z'],
    ]);
  });

  it('publishes P1 and P2 lab results as -egfr-v2 and checks existence by that @id only', async () => {
    const createAsset = jest.fn(async (_asset: Record<string, unknown>) => ({ UAL: 'ual:demo' }));
    const queries: string[] = [];
    const findAssets = jest.fn(async (query: string) => {
      queries.push(query);
      return { data: [] };
    });
    const config = { get: jest.fn((key: string) => (key === 'app.evidenceReferenceTime' ? REFERENCE_TIME : undefined)) } as any;
    await new PilotDemoSeedService({ findAssets, createAsset } as any, config, new ClockService(config)).onModuleInit();

    const labIds = createAsset.mock.calls.map(([asset]) => asset as any)
      .filter((asset) => asset['@type'] === 'rx:LabResult').map((asset) => asset['@id']);
    expect(labIds).toEqual([
      `urn:lab-result:pilot-${P1}-lab-a-egfr-v2`, `urn:lab-result:pilot-${P1}-lab-b-egfr-v2`,
      `urn:lab-result:pilot-${P2}-lab-a-egfr-v2`, `urn:lab-result:pilot-${P2}-lab-b-egfr-v2`,
      `urn:lab-result:pilot-${P3}-lab-a-egfr`, `urn:lab-result:pilot-${P4}-lab-a-egfr`,
    ]);
    const labQueries = queries.filter((query) => query.includes('rx:LabResult'));
    expect(labQueries[0]).toContain(`VALUES ?result { <urn:lab-result:pilot-${P1}-lab-a-egfr-v2> }`);
    expect(labQueries[4]).not.toContain('VALUES');
  });

  it('does not overwrite records that already exist in DKG', async () => {
    expect(await runSeed(true)).toEqual([]);
  });
});

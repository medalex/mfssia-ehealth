import { describe, it, expect, jest } from '@jest/globals';
import { PilotDemoSeedService } from './pilot-demo-seed.service';

describe('PilotDemoSeedService', () => {
  it('publishes the two allowed consent scopes and both demo lab results', async () => {
    const previous = process.env.PILOT_DEMO_SEED;
    process.env.PILOT_DEMO_SEED = 'true';
    const createAsset = jest.fn(async (_asset: Record<string, unknown>) => ({ UAL: 'ual:demo' }));
    const service = new PilotDemoSeedService(
      {
        findAssets: async () => ({ data: [] }),
        createAsset,
      } as any,
      { get: jest.fn((key: string) => (key === 'app.evidenceReferenceTime' ? undefined : undefined)) } as any,
    );

    try {
      await service.onModuleInit();
    } finally {
      if (previous === undefined) delete process.env.PILOT_DEMO_SEED;
      else process.env.PILOT_DEMO_SEED = previous;
    }

    const assets = createAsset.mock.calls.map(([asset]) => asset as any);
    const consents = assets.filter((asset) => asset['@type'] === 'rx:DataSharingConsent');
    expect(consents.map((asset) => asset['rx:consentCoversCustodian']).sort()).toEqual(['hospital-1', 'lab-a']);
    expect(consents.map((asset) => asset['rx:consentCoversCustodian'])).not.toContain('lab-b');
    expect(assets.filter((asset) => asset['@type'] === 'rx:LabResult').map((asset) => asset['rx:hasValue']['@value']))
      .toEqual(['45', '20']);
  });
});
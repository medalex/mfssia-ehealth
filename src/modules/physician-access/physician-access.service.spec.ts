import { describe, it, expect, jest } from '@jest/globals';
import { PhysicianAccessService } from './physician-access.service';

describe('PhysicianAccessService', () => {
  const createService = (findAssets: (query: string) => Promise<unknown>) => {
    const auditLog = { record: jest.fn(async () => undefined), recentAccess: jest.fn() } as any;
    const registry = { findById: () => ({ organizationId: 'hospital-1' }) } as any;
    const dkg = { findAssets } as any;
    return { service: new PhysicianAccessService(dkg, registry, auditLog), auditLog };
  };

  it('requires consent to cover both the organization and the custodian', async () => {
    const { service, auditLog } = createService(async (query) => {
      expect(query).toContain('rx:consentCoversCustodian "lab-a"');
      return { data: [] };
    });

    const decision = await service.checkAccess('doctor-1', 'patient-1', 'lab-a');

    expect(decision.authz).toBe(false);
    expect(decision.access).toBe(false);
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'denied',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      custodianId: 'lab-a',
    }));
  });

  it('records consent lookup outages as unavailable rather than denied', async () => {
    const { service, auditLog } = createService(async () => {
      throw new Error('connection refused');
    });

    await expect(service.checkAccess('doctor-1', 'patient-1', 'lab-a'))
      .rejects.toThrow(/DKG unavailable while checking patient consent/);
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'unavailable',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      custodianId: 'lab-a',
    }));
  });

  it('records runId on access.decision events for granted, denied and unavailable outcomes', async () => {
    const granted = createService(async () => ({ data: [{ c: 'urn:consent:1' }] }));
    await granted.service.checkAccess('doctor-1', 'patient-1', 'lab-a', 'run-9');
    const denied = createService(async () => ({ data: [] }));
    await denied.service.checkAccess('doctor-1', 'patient-1', 'lab-b', 'run-9');
    const unavailable = createService(async () => { throw new Error('offline'); });
    await expect(unavailable.service.checkAccess('doctor-1', 'patient-1', 'lab-a', 'run-9')).rejects.toThrow();

    for (const [{ auditLog }, outcome] of [[granted, 'granted'], [denied, 'denied'], [unavailable, 'unavailable']] as const) {
      expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'access.decision', outcome, runId: 'run-9',
      }));
    }
  });
});

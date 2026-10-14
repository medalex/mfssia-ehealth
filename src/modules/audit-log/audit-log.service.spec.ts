import { describe, it, expect } from '@jest/globals';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  it('persists actor, patient, custodian, outcome and returns the audit event id', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const repository: any = {
      create: (event: unknown) => event,
      save: async (event: Record<string, unknown>) => {
        saved.push(event);
        return { ...event, id: 'audit-123' };
      },
    };
    const service = new AuditLogService(repository);

    const tracked = await service.trackRead({
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      organizationId: 'hospital-1',
      custodianId: 'lab-a',
      resource: 'lab:eGFR',
      runId: 'pilot-run-001',
    }, async () => ({ state: 'present', value: 45 }));

    expect(tracked).toMatchObject({ value: { state: 'present', value: 45 }, auditEventId: 'audit-123' });
    expect(saved[0]).toMatchObject({
      doctorId: 'doctor-1', patientId: 'patient-1', custodianId: 'lab-a', outcome: 'success', runId: 'pilot-run-001',
    });
  });

  it('keeps runId on every event including access decisions when recording', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const repository: any = {
      create: (event: unknown) => event,
      save: async (event: Record<string, unknown>) => {
        saved.push(event);
        return { ...event, id: 'audit-456' };
      },
    };
    const service = new AuditLogService(repository);

    const result = await service.record({
      eventType: 'access.decision',
      outcome: 'granted',
      patientId: 'patient-2',
      doctorId: 'doctor-2',
      organizationId: 'hospital-1',
      custodianId: 'lab-b',
      resource: 'ConsentAccessSet',
      reason: 'granted',
      details: { access: true },
      runId: 'run-42',
    });

    expect(result).toMatchObject({ runId: 'run-42' });
    expect(saved[0]).toMatchObject({ runId: 'run-42' });
  });
});

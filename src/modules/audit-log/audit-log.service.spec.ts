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
    }, async () => ({ state: 'present', value: 45 }));

    expect(tracked).toMatchObject({ value: { state: 'present', value: 45 }, auditEventId: 'audit-123' });
    expect(saved[0]).toMatchObject({
      doctorId: 'doctor-1', patientId: 'patient-1', custodianId: 'lab-a', outcome: 'success',
    });
  });
});
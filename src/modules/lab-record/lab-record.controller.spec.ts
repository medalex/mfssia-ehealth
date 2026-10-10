import { describe, it, expect, jest } from '@jest/globals';
import { LabRecordController } from './lab-record.controller';

describe('LabRecordController protected proof read', () => {
  it('checks access and passes the custodian filter to the full-record proof builder', async () => {
    const proof = { labRecordRoot: 'root', measurements: [{ value: 45 }] };
    const labRecord = { getProof: jest.fn(async () => proof) };
    const auditLog = {
      trackRead: jest.fn(async (_context: unknown, read: () => Promise<unknown>) => ({ value: await read(), auditEventId: 'audit-1' })),
    };
    const access = {
      checkAccess: jest.fn(async () => ({ access: true, organizationId: 'hospital-1' })),
    };
    const controller = new LabRecordController(labRecord as any, auditLog as any, access as any);

    await expect(controller.getProof('patient-1', 'doctor-1', 'lab-a')).resolves.toBe(proof);
    expect(labRecord.getProof).toHaveBeenCalledWith('patient-1', true, 'lab-a');
    expect(auditLog.trackRead).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: 'doctor-1', patientId: 'patient-1', custodianId: 'lab-a',
    }), expect.any(Function));
  });
});
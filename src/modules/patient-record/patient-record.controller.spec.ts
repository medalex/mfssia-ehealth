import { describe, it, expect, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { PatientRecordController } from './patient-record.controller';

describe('PatientRecordController protected proof read', () => {
  it('does not return proof when access is denied and records actor scope', async () => {
    const patientRecord = { getProof: jest.fn(async () => ({ patientRecordRoot: 'secret' })) };
    const auditLog = { record: jest.fn(async () => ({ id: 'audit-denied' })) };
    const access = {
      checkAccess: jest.fn(async () => ({
        access: false, organizationId: 'hospital-1', reason: 'consent does not cover custodian',
      })),
    };
    const controller = new PatientRecordController(patientRecord as any, auditLog as any, access as any);

    try {
      await controller.getProof('patient-1', 'doctor-1', 'hospital-1');
      throw new Error('expected access refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        error: 'access_denied', auditEventId: 'audit-denied',
      });
    }

    expect(patientRecord.getProof).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: 'doctor-1', patientId: 'patient-1', custodianId: 'hospital-1', outcome: 'access_denied',
    }));
  });

  it('rejects allergy reads from custodians other than the pilot owner', async () => {
    const patientRecord = { getProof: jest.fn(async () => ({ patientRecordRoot: 'secret' })) };
    const auditLog = { record: jest.fn(async () => ({ id: 'audit-not-owner' })) };
    const access = { checkAccess: jest.fn() };
    const controller = new PatientRecordController(patientRecord as any, auditLog as any, access as any);

    await expect(controller.getProof('patient-1', 'doctor-1', 'lab-a')).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ error: 'not_custodian', reason: 'not_custodian' }),
    });
    expect(access.checkAccess).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: 'doctor-1', custodianId: 'lab-a', outcome: 'not_custodian',
    }));
  });
});
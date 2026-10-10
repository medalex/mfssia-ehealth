import { describe, it, expect, jest } from '@jest/globals';
import { DkgUnavailableException } from '@/shared/exceptions/dkg-unavailable.exception';
import { EvidenceStatusService } from './evidence-status.service';

describe('EvidenceStatusService', () => {
  const context = {
    patientId: '00000000-0000-0000-0000-000000000001',
    doctorId: '00000000-0000-0000-0002-000000000001',
    custodianId: 'lab-b',
    attribute: 'lab:eGFR',
  };

  const createService = (overrides: Record<string, any> = {}) => {
    const access = { checkAccess: jest.fn(async () => ({ access: true, organizationId: 'hospital-1' })) };
    const patientRecord = { getAllergies: jest.fn(async () => []) };
    const labRecord = {
      getCustodianMeasurements: jest.fn(async () => []),
      getMeasurements: jest.fn(async () => []),
    };
    const auditLog = { record: jest.fn(async () => ({ id: 'audit-event-1' })) };
    const config = { get: jest.fn(() => 90) };
    return {
      service: new EvidenceStatusService(
        { ...access, ...overrides.access } as any,
        { ...patientRecord, ...overrides.patientRecord } as any,
        { ...labRecord, ...overrides.labRecord } as any,
        { ...auditLog, ...overrides.auditLog } as any,
        { ...config, ...overrides.config } as any,
      ),
      access: { ...access, ...overrides.access },
      auditLog: { ...auditLog, ...overrides.auditLog },
      labRecord: { ...labRecord, ...overrides.labRecord },
    };
  };

  it('returns unknown/access_denied without querying a custodian that lacks consent', async () => {
    const { service, auditLog, labRecord } = createService({
      access: { checkAccess: jest.fn(async () => ({ access: false, organizationId: 'hospital-1', reason: 'no consent' })) },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, context.custodianId, context.attribute,
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'access_denied', source: { auditEventId: 'audit-event-1' } });
    expect(labRecord.getCustodianMeasurements).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: context.doctorId, custodianId: 'lab-b', outcome: 'access_denied',
    }));
  });

  it('returns unknown/unavailable when the access check cannot query DKG', async () => {
    const { service, auditLog } = createService({
      access: { checkAccess: jest.fn(async () => { throw new DkgUnavailableException('DKG offline'); }) },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, context.custodianId, context.attribute,
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'unavailable' });
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: context.doctorId, custodianId: 'lab-b', outcome: 'unavailable',
      details: { error: 'DKG offline' },
    }));
  });

  it('returns unknown/unavailable when the evidence query fails after access was granted', async () => {
    const { service, auditLog } = createService({
      labRecord: {
        getCustodianMeasurements: jest.fn(async () => { throw new DkgUnavailableException('evidence store offline'); }),
      },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'lab-a', context.attribute,
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'unavailable' });
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: context.doctorId, custodianId: 'lab-a', outcome: 'unavailable',
      details: { error: 'evidence store offline' },
    }));
  });

  it('returns an old custodian-owned lab value as present and stale', async () => {
    const { service } = createService({
      access: { checkAccess: jest.fn(async () => ({ access: true, organizationId: 'hospital-1' })) },
      labRecord: {
        getCustodianMeasurements: jest.fn(async () => [
          { metric: 'eGFR', value: 45, measuredAt: '2025-10-10T08:00:00.000Z' },
        ]),
      },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'lab-a', context.attribute,
    );

    expect(result).toMatchObject({
      state: 'present', value: 45, measuredAt: '2025-10-10T08:00:00.000Z', stale: true,
      source: { custodianId: 'lab-a', auditEventId: 'audit-event-1' },
    });
  });

  it('does not query other custodians when the requested source has no matching metric', async () => {
    const { service, labRecord } = createService();

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'lab-a', context.attribute,
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'not_custodian' });
    expect(labRecord.getMeasurements).not.toHaveBeenCalled();
  });

  it('reports a successful empty allergy query as confirmed absent', async () => {
    const { service } = createService({
      access: { checkAccess: jest.fn(async () => ({ access: true, organizationId: 'hospital-1' })) },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'hospital-1', 'allergies',
    );

    expect(result).toMatchObject({ state: 'confirmed_absent', reason: null });
  });

  it('reports allergies requested from a non-owner as not_custodian', async () => {
    const { service, access, auditLog } = createService();

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'lab-a', 'allergies',
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'not_custodian' });
    expect(access.checkAccess).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: context.doctorId, custodianId: 'lab-a', outcome: 'not_custodian',
    }));
  });
});
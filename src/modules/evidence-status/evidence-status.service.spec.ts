import { describe, it, expect, jest } from '@jest/globals';
import { DkgUnavailableException } from '@/shared/exceptions/dkg-unavailable.exception';
import { ClockService } from '@/shared/clock/clock.service';
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
        overrides.clock,
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

  it('reports a successful empty query to a valid custodian as confirmed absent', async () => {
    const { service, labRecord } = createService({
      access: { checkAccess: jest.fn(async () => ({ access: true, organizationId: 'hospital-1' })) },
    });

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'lab-a', context.attribute,
    );

    expect(result).toMatchObject({ state: 'confirmed_absent', reason: null });
    expect(labRecord.getCustodianMeasurements).toHaveBeenCalledWith(context.patientId, 'lab-a');
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

  it('reports lab:eGFR requested from hospital-1 as not_custodian without checking access', async () => {
    const { service, access, labRecord } = createService();

    const result = await service.getStatus(
      context.patientId, context.doctorId, 'hospital-1', 'lab:eGFR',
    );

    expect(result).toMatchObject({ state: 'unknown', reason: 'not_custodian' });
    expect(access.checkAccess).not.toHaveBeenCalled();
    expect(labRecord.getCustodianMeasurements).not.toHaveBeenCalled();
  });

  it('marks a -365 d measurement stale and a -7 d measurement fresh at a fixed reference time', async () => {
    const clock = new ClockService({ get: () => '2026-10-10T00:00:00Z' } as any);
    const measurements: Record<string, Array<Record<string, unknown>>> = {
      'lab-a': [{ metric: 'eGFR', value: 45, measuredAt: '2025-10-10T00:00:00.000Z' }],
      'lab-b': [{ metric: 'eGFR', value: 20, measuredAt: '2026-10-03T00:00:00.000Z' }],
    };
    const { service } = createService({
      clock,
      labRecord: { getCustodianMeasurements: jest.fn(async (_patientId: string, custodianId: string) => measurements[custodianId]) },
    });

    const labA = await service.getStatus(context.patientId, context.doctorId, 'lab-a', 'lab:eGFR');
    const labB = await service.getStatus(context.patientId, context.doctorId, 'lab-b', 'lab:eGFR');

    expect(labA).toMatchObject({ state: 'present', value: 45, stale: true });
    expect(labB).toMatchObject({ state: 'present', value: 20, stale: false });
  });

  it('passes runId to the access check and to every evidence.status event', async () => {
    const { service, access, auditLog } = createService({
      access: {
        checkAccess: jest.fn(async (_d: string, _p: string, custodianId: string) => (
          { access: custodianId !== 'lab-b', organizationId: 'hospital-1' })),
      },
    });

    await service.getStatus(context.patientId, context.doctorId, 'hospital-1', 'allergies', 'run-7');
    await service.getStatus(context.patientId, context.doctorId, 'lab-a', 'lab:eGFR', 'run-7');
    await service.getStatus(context.patientId, context.doctorId, 'lab-b', 'lab:eGFR', 'run-7');
    await service.getStatus(context.patientId, context.doctorId, 'lab-a', 'allergies', 'run-7');

    expect(access.checkAccess).toHaveBeenCalledTimes(3);
    for (const call of access.checkAccess.mock.calls) expect(call[3]).toBe('run-7');
    expect(auditLog.record).toHaveBeenCalledTimes(4);
    for (const [event] of auditLog.record.mock.calls as any[]) {
      expect(event).toMatchObject({ eventType: 'evidence.status', runId: 'run-7' });
    }
  });
});

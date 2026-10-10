import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { LabRecordService } from '@/modules/lab-record/lab-record.service';
import { PatientRecordService } from '@/modules/patient-record/patient-record.service';
import { PhysicianAccessService } from '@/modules/physician-access/physician-access.service';
import { DkgUnavailableException } from '@/shared/exceptions/dkg-unavailable.exception';

export type EvidenceState = 'present' | 'confirmed_absent' | 'unknown';
export type EvidenceReason = 'access_denied' | 'unavailable' | 'not_custodian' | 'not_queried' | null;

export interface EvidenceStatusResponse {
  attribute: string;
  custodianId: string;
  state: EvidenceState;
  reason: EvidenceReason;
  value?: unknown;
  measuredAt?: string | null;
  stale?: boolean;
  source: { custodianId: string; auditEventId: string };
}

@Injectable()
export class EvidenceStatusService {
  constructor(
    private readonly access: PhysicianAccessService,
    private readonly patientRecord: PatientRecordService,
    private readonly labRecord: LabRecordService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  async getStatus(
    patientId: string,
    doctorId: string,
    custodianId: string,
    attribute: string,
  ): Promise<EvidenceStatusResponse> {
    if (!doctorId || !custodianId) {
      throw new BadRequestException('doctorId and custodianId are required');
    }
    if (!attribute) throw new BadRequestException('attribute is required');
    const labMetric = attribute.startsWith('lab:') ? attribute.slice(4).trim() : null;
    if (attribute !== 'allergies' && (!labMetric || !attribute.startsWith('lab:'))) {
      throw new BadRequestException('attribute must be allergies or lab:<metric>');
    }

    if (attribute === 'allergies' && custodianId !== 'hospital-1') {
      return this.recordStatus({
        attribute, patientId, doctorId, organizationId: null, custodianId,
        state: 'unknown', reason: 'not_custodian', details: { expectedCustodianId: 'hospital-1' },
      });
    }

    // A successful empty query means nothing is published by this custodian; it does not
    // establish that the custodian's record is complete.

    let decision;
    try {
      decision = await this.access.checkAccess(doctorId, patientId, custodianId);
    } catch (error) {
      if (error instanceof DkgUnavailableException) {
        return this.recordStatus({
          attribute, patientId, doctorId, organizationId: null, custodianId,
          state: 'unknown', reason: 'unavailable', details: { error: error.message },
        });
      }
      throw error;
    }

    if (!decision.access) {
      return this.recordStatus({
        attribute, patientId, doctorId, organizationId: decision.organizationId, custodianId,
        state: 'unknown', reason: 'access_denied', details: { accessReason: decision.reason },
      });
    }

    try {
      if (attribute === 'allergies') {
        const allergies = await this.patientRecord.getAllergies(patientId);
        return this.recordStatus({
          attribute, patientId, doctorId, organizationId: decision.organizationId, custodianId,
          state: allergies.length ? 'present' : 'confirmed_absent', reason: null,
          value: allergies.length ? allergies : undefined,
          details: { resultCount: allergies.length },
        });
      }

      const owned = await this.labRecord.getCustodianMeasurements(patientId, custodianId);
      const matching = owned.filter((item) => item.metric.toLowerCase() === labMetric!.toLowerCase());
      if (matching.length === 0) {
        return this.recordStatus({
          attribute, patientId, doctorId, organizationId: decision.organizationId, custodianId,
          state: 'unknown', reason: 'not_custodian',
          details: { resultCount: 0 },
        });
      }

      const latest = matching.sort((a, b) => Date.parse(b.measuredAt ?? '') - Date.parse(a.measuredAt ?? ''))[0];
      const staleAfterDays = this.config.get<number>('app.labStaleAfterDays') ?? 90;
      const measuredAtTime = latest.measuredAt ? Date.parse(latest.measuredAt) : Number.NaN;
      const stale = !Number.isFinite(measuredAtTime) || Date.now() - measuredAtTime > staleAfterDays * 86400000;
      return this.recordStatus({
        attribute, patientId, doctorId, organizationId: decision.organizationId, custodianId,
        state: 'present', reason: null, value: latest.value, measuredAt: latest.measuredAt, stale,
        details: { resultCount: matching.length, staleAfterDays },
      });
    } catch (error) {
      if (!(error instanceof DkgUnavailableException)) throw error;
      return this.recordStatus({
        attribute, patientId, doctorId, organizationId: decision.organizationId, custodianId,
        state: 'unknown', reason: 'unavailable',
        details: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private async recordStatus(input: {
    attribute: string;
    patientId: string;
    doctorId: string;
    organizationId: string | null;
    custodianId: string;
    state: EvidenceState;
    reason: EvidenceReason;
    value?: unknown;
    measuredAt?: string | null;
    stale?: boolean;
    details: Record<string, unknown>;
  }): Promise<EvidenceStatusResponse> {
    const event = await this.auditLog.record({
      eventType: 'evidence.status',
      outcome: input.reason ?? input.state,
      patientId: input.patientId,
      doctorId: input.doctorId,
      organizationId: input.organizationId,
      custodianId: input.custodianId,
      resource: input.attribute,
      reason: input.reason,
      details: input.details,
    });
    return {
      attribute: input.attribute,
      custodianId: input.custodianId,
      state: input.state,
      reason: input.reason,
      ...(input.state === 'present' ? { value: input.value } : {}),
      ...(input.measuredAt !== undefined ? { measuredAt: input.measuredAt } : {}),
      ...(input.stale !== undefined ? { stale: input.stale } : {}),
      source: { custodianId: input.custodianId, auditEventId: event.id },
    };
  }
}
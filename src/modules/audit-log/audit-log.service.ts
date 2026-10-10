import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export const validateRunId = (runId?: string): string | undefined => {
  if (runId === undefined || runId === null || runId === '') return undefined;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(runId)) {
    throw new BadRequestException({ error: 'invalid_run_id', reason: 'runId must match ^[A-Za-z0-9_-]{1,64}$' });
  }
  return runId;
};

export type AuditEventInput = Pick<
  AuditEvent,
  | 'eventType'
  | 'outcome'
  | 'patientId'
  | 'doctorId'
  | 'organizationId'
  | 'custodianId'
  | 'resource'
  | 'reason'
  | 'details'
  | 'runId'
>;

export interface ReadAuditContext {
  patientId: string;
  doctorId: string;
  organizationId: string | null;
  custodianId: string;
  resource: string;
  outcome?: string;
  reason?: string | null;
  details?: Record<string, unknown> | null;
  runId?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditEvent) private readonly events: Repository<AuditEvent>) {}

  async record(event: AuditEventInput): Promise<AuditEvent> {
    return this.events.save(this.events.create(event));
  }

  async trackRead<T>(context: ReadAuditContext, read: () => Promise<T>): Promise<{ value: T; auditEventId: string }> {
    try {
      const result = await read();
      const evidenceState = (result as any)?.state;
      const event = await this.record({
        eventType: 'data.read',
        outcome: context.outcome ?? (evidenceState === 'unknown' ? 'unknown' : 'success'),
        patientId: context.patientId,
        doctorId: context.doctorId,
        organizationId: context.organizationId,
        custodianId: context.custodianId,
        resource: context.resource,
        reason: context.reason ?? null,
        details: context.details ?? (evidenceState ? { evidenceState } : null),
        runId: context.runId ?? null,
      });
      return { value: result, auditEventId: event.id };
    } catch (e: any) {
      await this.record({
        eventType: 'data.read',
        outcome: 'unavailable',
        patientId: context.patientId,
        doctorId: context.doctorId,
        organizationId: context.organizationId,
        custodianId: context.custodianId,
        resource: context.resource,
        reason: 'unavailable',
        details: { error: e?.message ?? 'Data read failed' },
        runId: context.runId ?? null,
      });
      throw e;
    }
  }

  async recentAccess(limit = 10): Promise<AuditEvent[]> {
    return this.events.find({
      where: { eventType: 'access.decision' },
      order: { createdAt: 'DESC' },
      take: Math.max(1, Math.min(limit, 100)),
    });
  }

  async listByRunId(runId: string): Promise<AuditEvent[]> {
    return this.events.find({
      where: { runId },
      order: { createdAt: 'ASC' },
    });
  }
}
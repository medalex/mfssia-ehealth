import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

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
}
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

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditEvent) private readonly events: Repository<AuditEvent>) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.events.save(this.events.create(event));
  }

  async trackRead<T>(resource: string, patientId: string | null, read: () => Promise<T>): Promise<T> {
    try {
      const result = await read();
      const evidenceStatus = (result as any)?.status;
      await this.record({
        eventType: 'data.read',
        outcome: evidenceStatus === 'unknown' ? 'unknown' : 'success',
        patientId,
        doctorId: null,
        organizationId: null,
        custodianId: null,
        resource,
        reason: evidenceStatus === 'unknown' ? (result as any).reason : null,
        details: evidenceStatus ? { evidenceStatus } : null,
      });
      return result;
    } catch (e: any) {
      await this.record({
        eventType: 'data.read',
        outcome: 'unavailable',
        patientId,
        doctorId: null,
        organizationId: null,
        custodianId: null,
        resource,
        reason: e?.message ?? 'Data read failed',
        details: null,
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
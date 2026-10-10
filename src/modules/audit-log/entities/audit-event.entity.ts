import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_events')
@Index('IDX_audit_events_created_at', ['createdAt'])
@Index('IDX_audit_events_patient_id', ['patientId'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  eventType: string;

  @Column({ type: 'varchar', length: 32 })
  outcome: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  patientId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  doctorId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custodianId: string | null;

  @Column({ type: 'varchar', length: 120 })
  resource: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChallengeInstance } from '../../challenge-instance/entities/challenge-instance.entity';
import { Uuid } from '@/common/types/common.type';

@Entity('challenge_evidences')
export class ChallengeEvidence {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_challenge_evidence',
  })
  id: Uuid;

  @Column({ type: 'varchar', length: 100 })
  challengeId: string; // e.g., "mfssia:C-A-1"

  @Column({ type: 'jsonb' })
  evidence: Record<string, any>; // Flexible structure per challenge

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  // Belongs to one challenge instance
  @ManyToOne(() => ChallengeInstance, (instance) => instance.evidences, {
    onDelete: 'CASCADE',
  })
  challengeInstance: ChallengeInstance;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

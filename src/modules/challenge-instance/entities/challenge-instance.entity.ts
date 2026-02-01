import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChallengeEvidence } from '../../challenge-evidence/entities/challenge-evidence.entity';
import { MfssiaIdentity } from 'src/modules/mfssia-identity/entities/mfssia-identity.entity';
import { InstanceState } from '@/common/enums/instance-state.enum';
import { Uuid } from '@/common/types/common.type';

@Entity('challenge_instances')
export class ChallengeInstance {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_challenge_instance',
  })
  id: Uuid;

  @Column({ type: 'varchar', length: 100 })
  challengeSet: string; // Reference to ChallengeSet.id

  @Column({ type: 'varchar', length: 255 })
  nonce: string;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Index()
  @Column({ type: 'varchar', length: 50, default: InstanceState.IN_PROGRESS })
  state: InstanceState;

  // Link to subject DID
  @ManyToOne(() => MfssiaIdentity, (identity) => identity.challengeInstances)
  identity: MfssiaIdentity;

  // One instance has many evidence submissions
  @OneToMany(() => ChallengeEvidence, (evidence) => evidence.challengeInstance)
  evidences: ChallengeEvidence[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

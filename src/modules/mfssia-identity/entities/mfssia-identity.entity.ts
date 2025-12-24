import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChallengeInstance } from '../../challenge-instance/entities/challenge-instance.entity';
import { RegistrationState } from '@/common/enums/registration-state.enum';
import { Uuid } from '@/common/types/common.type';

@Entity('mfssia_identities')
export class MfssiaIdentity {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_mfssia_identity',
  })
  id!: Uuid;
  @Column({ type: 'varchar', length: 255, unique: true })
  identifier: string; // DID e.g., "did:web:userA"

  @Column({ type: 'varchar', length: 100 })
  requestedChallengeSet: string; // e.g., "mfssia:Example-A"

  @Column({
    type: 'varchar',
    length: 50,
    default: RegistrationState.PENDING_CHALLENGE,
  })
  registrationState: RegistrationState;

  @Column({ type: 'timestamp', nullable: true })
  registeredAt?: Date;

  // One identity can have many challenge instances (multiple authentication attempts)
  @OneToMany(() => ChallengeInstance, (instance) => instance.identity)
  challengeInstances: ChallengeInstance[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

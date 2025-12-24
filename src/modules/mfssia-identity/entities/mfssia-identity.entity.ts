import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChallengeInstance } from '../../challenge-instance/entities/challenge-instance.entity';
import { RegistrationState } from '@/common/enums/registration-state.enum';

@Entity('mfssia_identities')
export class MfssiaIdentity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
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

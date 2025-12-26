import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PendingVerificationStatus } from '../pending-verification.enums';

@Entity('pending_verifications')
@Index(['requestId'], { unique: true }) // Ensure no duplicate tracking
export class PendingVerification {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_pending_verification',
  })
  id: string;

  @Column({ type: 'varchar', length: 66, unique: true })
  @Index()
  requestId: string; // Chainlink Functions requestId (bytes32 as hex)

  @Column({ type: 'varchar', length: 36 })
  @Index()
  instanceId: string; // ChallengeInstance UUID

  @Column({ type: 'varchar', length: 255 })
  subjectDid: string; // User's DID

  @Column({ type: 'varchar', length: 100 })
  challengeSetCode: string; // e.g., "mfssia:Example-D"

  @Column({
    type: 'enum',
    enum: PendingVerificationStatus,
    default: PendingVerificationStatus.PENDING,
  })
  status: PendingVerificationStatus;

  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null; // Transaction that triggered request

  @Column({ type: 'text', nullable: true })
  rawResponse: string | null; // Full JSON response from oracle

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @UpdateDateColumn({ name: 'completed_at', nullable: true })
  completedAt: Date | null;
}

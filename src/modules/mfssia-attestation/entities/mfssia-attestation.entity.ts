import { IsEnum } from 'class-validator';
import { AggregationRule } from 'src/common/enums/aggregation-rule.enum';
import { MfssiaIdentity } from 'src/modules/mfssia-identity/entities/mfssia-identity.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('mfssia_attestations')
export class MfssiaAttestation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  identity: string; // DID

  @Column({ type: 'varchar', length: 100 })
  challengeSet: string;

  @Column({ type: 'simple-array' })
  verifiedChallenges: string[];

  @Column({ type: 'text' })
  oracleAttestation: string; // requestId or composite proof

  @Column({ type: 'timestamp' })
  validFrom: Date;

  @Column({ type: 'timestamp' })
  validUntil: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ual?: string; // DKG UAL after anchoring

  @Column({ type: 'varchar', length: 50 })
  @IsEnum(AggregationRule)
  aggregationRule: AggregationRule;

  // Optional link back to identity
  @ManyToOne(() => MfssiaIdentity, (identity) => identity.challengeInstances)
  identityEntity?: MfssiaIdentity;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

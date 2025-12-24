import { IsEnum } from 'class-validator';
import { ChallengeStatus } from 'src/common/enums/challenge-status.enum';
import { FactorClass } from 'src/common/enums/factor-class.enum';
import { ChallengeSet } from 'src/modules/challenge-set/entities/challenge-set.entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';

@Entity('challenge_definitions')
export class ChallengeDefinition {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g., "mfssia:C-A-1"

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  @IsEnum(FactorClass)
  factorClass: FactorClass;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb' })
  expectedEvidence: Array<{ type: string; name: string; dataType: string }>;

  @Column({ type: 'jsonb' })
  oracle: {
    type: string;
    name: string;
    oracleType: string;
    verificationMethod: string;
  };

  @Column({ type: 'jsonb' })
  evaluation: { resultType: string; passCondition: string };

  @Column({ type: 'text' })
  failureEffect: string;

  @Column({ type: 'varchar', length: 50 })
  reusability: string;

  @Column({ type: 'varchar', length: 10 })
  version: string;

  @Column({ type: 'varchar', length: 20, default: ChallengeStatus.ACTIVE })
  @IsEnum(ChallengeStatus)
  status: ChallengeStatus;

  // Reverse relation: which sets use this definition
  @ManyToMany(() => ChallengeSet, (set) => set.challengeDefinitions)
  challengeSets: ChallengeSet[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

import { AggregationRule } from '@/common/enums/aggregation-rule.enum';
import { Uuid } from '@/common/types/common.type';
import { ChallengeDefinition } from 'src/modules/challenge-definitions/entities/challenge-definitions.entity';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('challenge_sets')
export class ChallengeSet {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_challenge_set',
  })
  id: Uuid;

  // Business/natural key — semantic, human-readable, immutable ID
  // Example: "mfssia:Example-A"
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 10 })
  version: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'jsonb' })
  publishedBy: { type: string; name: string };

  @Column({ type: 'simple-array' })
  mandatoryChallenges: string[];

  @Column({ type: 'simple-array' })
  optionalChallenges: string[];

  @Column({ type: 'jsonb' })
  policy: {
    minChallengesRequired: number;
    aggregationRule: AggregationRule;
    confidenceThreshold: number | null;
  };

  @Column({ type: 'jsonb' })
  lifecycle: {
    creationEvent: string;
    mutation: string;
    deprecationPolicy: string;
  };

  @ManyToMany(() => ChallengeDefinition, (def) => def.challengeSets)
  @JoinTable({
    name: 'challenge_set_definitions',
    joinColumn: { name: 'challenge_set_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'challenge_definition_id',
      referencedColumnName: 'id',
    },
  })
  challengeDefinitions: ChallengeDefinition[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ual: string | null; 
}

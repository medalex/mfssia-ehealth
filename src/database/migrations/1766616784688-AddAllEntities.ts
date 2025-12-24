import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllEntities1766616784688 implements MigrationInterface {
  name = 'AddAllEntities1766616784688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "challenge_sets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(100) NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text NOT NULL,
                "version" character varying(10) NOT NULL,
                "status" character varying(20) NOT NULL,
                "publishedBy" jsonb NOT NULL,
                "mandatoryChallenges" text NOT NULL,
                "optionalChallenges" text NOT NULL,
                "policy" jsonb NOT NULL,
                "lifecycle" jsonb NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_65e1315b97c4a121ea0103bd8e9" UNIQUE ("code"),
                CONSTRAINT "PK_challenge_set" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "challenge_definitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(100) NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text NOT NULL,
                "factorClass" character varying(50) NOT NULL,
                "question" text NOT NULL,
                "expectedEvidence" jsonb NOT NULL,
                "oracle" jsonb NOT NULL,
                "evaluation" jsonb NOT NULL,
                "failureEffect" text NOT NULL,
                "reusability" character varying(50) NOT NULL,
                "version" character varying(10) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_1750b2c678fce14340136c92a8b" UNIQUE ("code"),
                CONSTRAINT "PK_challenge_definition" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "mfssia_identities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "identifier" character varying(255) NOT NULL,
                "requestedChallengeSet" character varying(100) NOT NULL,
                "registrationState" character varying(50) NOT NULL DEFAULT 'PENDING_CHALLENGE',
                "registeredAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_479b4817a1ef6aeb927a361def4" UNIQUE ("identifier"),
                CONSTRAINT "PK_mfssia_identity" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "challenge_instances" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "challengeSet" character varying(100) NOT NULL,
                "nonce" character varying(255) NOT NULL,
                "issuedAt" TIMESTAMP NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "state" character varying(50) NOT NULL DEFAULT 'IN_PROGRESS',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "identityId" uuid,
                CONSTRAINT "PK_challenge_instance" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "challenge_evidences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "challengeId" character varying(100) NOT NULL,
                "evidence" jsonb NOT NULL,
                "submittedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "challengeInstanceId" uuid,
                CONSTRAINT "PK_challenge_evidence" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "mfssia_attestations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "identity" character varying(255) NOT NULL,
                "challengeSet" character varying(100) NOT NULL,
                "verifiedChallenges" text NOT NULL,
                "oracleAttestation" text NOT NULL,
                "validFrom" TIMESTAMP NOT NULL,
                "validUntil" TIMESTAMP NOT NULL,
                "ual" character varying(255),
                "aggregationRule" character varying(50) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "identityEntityId" uuid,
                CONSTRAINT "PK_mfssia_attestation" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "challenge_set_definitions" (
                "challenge_set_id" uuid NOT NULL,
                "challenge_definition_id" uuid NOT NULL,
                CONSTRAINT "PK_d5172c879ebfdac7dcafa3488bc" PRIMARY KEY ("challenge_set_id", "challenge_definition_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_92a66af4a2359de9833a596451" ON "challenge_set_definitions" ("challenge_set_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5202566f52fb300ecfb17c4702" ON "challenge_set_definitions" ("challenge_definition_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_instances"
            ADD CONSTRAINT "FK_062580b0389c2c1f9328c8ec050" FOREIGN KEY ("identityId") REFERENCES "mfssia_identities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_evidences"
            ADD CONSTRAINT "FK_5d9771c12e2bb7b5e7f6763a10b" FOREIGN KEY ("challengeInstanceId") REFERENCES "challenge_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "mfssia_attestations"
            ADD CONSTRAINT "FK_e50d221947f3a1d7627b632f76a" FOREIGN KEY ("identityEntityId") REFERENCES "mfssia_identities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_set_definitions"
            ADD CONSTRAINT "FK_92a66af4a2359de9833a596451e" FOREIGN KEY ("challenge_set_id") REFERENCES "challenge_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_set_definitions"
            ADD CONSTRAINT "FK_5202566f52fb300ecfb17c4702c" FOREIGN KEY ("challenge_definition_id") REFERENCES "challenge_definitions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "challenge_set_definitions" DROP CONSTRAINT "FK_5202566f52fb300ecfb17c4702c"
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_set_definitions" DROP CONSTRAINT "FK_92a66af4a2359de9833a596451e"
        `);
    await queryRunner.query(`
            ALTER TABLE "mfssia_attestations" DROP CONSTRAINT "FK_e50d221947f3a1d7627b632f76a"
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_evidences" DROP CONSTRAINT "FK_5d9771c12e2bb7b5e7f6763a10b"
        `);
    await queryRunner.query(`
            ALTER TABLE "challenge_instances" DROP CONSTRAINT "FK_062580b0389c2c1f9328c8ec050"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5202566f52fb300ecfb17c4702"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_92a66af4a2359de9833a596451"
        `);
    await queryRunner.query(`
            DROP TABLE "challenge_set_definitions"
        `);
    await queryRunner.query(`
            DROP TABLE "mfssia_attestations"
        `);
    await queryRunner.query(`
            DROP TABLE "challenge_evidences"
        `);
    await queryRunner.query(`
            DROP TABLE "challenge_instances"
        `);
    await queryRunner.query(`
            DROP TABLE "mfssia_identities"
        `);
    await queryRunner.query(`
            DROP TABLE "challenge_definitions"
        `);
    await queryRunner.query(`
            DROP TABLE "challenge_sets"
        `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingVerification1768151559873 implements MigrationInterface {
  name = 'AddPendingVerification1768151559873';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."pending_verifications_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'ERROR')
        `);
    await queryRunner.query(`
            CREATE TABLE "pending_verifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requestId" character varying(66) NOT NULL,
                "instanceId" character varying(36) NOT NULL,
                "subjectDid" character varying(255) NOT NULL,
                "challengeSetCode" character varying(100) NOT NULL,
                "status" "public"."pending_verifications_status_enum" NOT NULL DEFAULT 'PENDING',
                "txHash" character varying(66),
                "rawResponse" text,
                "errorMessage" text,
                "requested_at" TIMESTAMP NOT NULL DEFAULT now(),
                "completed_at" TIMESTAMP DEFAULT now(),
                CONSTRAINT "UQ_1f34ae4cf67f30e4c04f704bbe2" UNIQUE ("requestId"),
                CONSTRAINT "PK_pending_verification" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1f34ae4cf67f30e4c04f704bbe" ON "pending_verifications" ("requestId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d0dd6c5fb2b9c6630260b7b719" ON "pending_verifications" ("instanceId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1f34ae4cf67f30e4c04f704bbe"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d0dd6c5fb2b9c6630260b7b719"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1f34ae4cf67f30e4c04f704bbe"
        `);
    await queryRunner.query(`
            DROP TABLE "pending_verifications"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."pending_verifications_status_enum"
        `);
  }
}

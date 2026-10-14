import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRunIdToAuditEvents1791590400001 implements MigrationInterface {
  name = 'AddRunIdToAuditEvents1791590400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "audit_events" ADD COLUMN "runId" character varying(64)');
    await queryRunner.query('CREATE INDEX "IDX_audit_events_run_id" ON "audit_events" ("runId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_audit_events_run_id"');
    await queryRunner.query('ALTER TABLE "audit_events" DROP COLUMN "runId"');
  }
}

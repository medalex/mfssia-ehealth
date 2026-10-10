import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditEvents1791590400000 implements MigrationInterface {
  name = 'AddAuditEvents1791590400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventType" character varying(80) NOT NULL,
        "outcome" character varying(32) NOT NULL,
        "patientId" character varying(255),
        "doctorId" character varying(255),
        "organizationId" character varying(255),
        "custodianId" character varying(255),
        "resource" character varying(120) NOT NULL,
        "reason" text,
        "details" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_audit_events_created_at" ON "audit_events" ("createdAt")');
    await queryRunner.query('CREATE INDEX "IDX_audit_events_patient_id" ON "audit_events" ("patientId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_audit_events_patient_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_audit_events_created_at"');
    await queryRunner.query('DROP TABLE "audit_events"');
  }
}
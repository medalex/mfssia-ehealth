import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUalToChallengeSet1768421750120 implements MigrationInterface {
    name = 'AddUalToChallengeSet1768421750120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "challenge_sets"
            ADD "ual" character varying(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "challenge_sets" DROP COLUMN "ual"
        `);
    }

}

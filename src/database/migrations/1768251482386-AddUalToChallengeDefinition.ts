import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUalToChallengeDefinition1768251482386 implements MigrationInterface {
    name = 'AddUalToChallengeDefinition1768251482386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "challenge_definitions"
            ADD "ual" character varying(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "challenge_definitions" DROP COLUMN "ual"
        `);
    }

}

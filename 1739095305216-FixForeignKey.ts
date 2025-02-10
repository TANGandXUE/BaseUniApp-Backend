import { MigrationInterface, QueryRunner } from "typeorm";

export class FixForeignKey1739095305216 implements MigrationInterface {
    name = 'FixForeignKey1739095305216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_points\` CHANGE \`userPointsExpireDate\` \`userPointsExpireDate\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_membership\` CHANGE \`userMembershipExpireDate\` \`userMembershipExpireDate\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_premium_feature\` CHANGE \`userPremiumFeatureExpireDate\` \`userPremiumFeatureExpireDate\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`apps\` CHANGE \`AppCreateTime\` \`AppCreateTime\` timestamp NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`apps\` CHANGE \`AppCreateTime\` \`AppCreateTime\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`user_premium_feature\` CHANGE \`userPremiumFeatureExpireDate\` \`userPremiumFeatureExpireDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`user_membership\` CHANGE \`userMembershipExpireDate\` \`userMembershipExpireDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`user_points\` CHANGE \`userPointsExpireDate\` \`userPointsExpireDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    }

}

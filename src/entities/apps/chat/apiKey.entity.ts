import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ApiKey {
    // API密钥ID
    @PrimaryGeneratedColumn({ type: "integer" })
    apiKeyId: number;

    // API密钥
    @Column({ length: 64, unique: true })
    apiKey: string;

    // API密钥用户ID
    @Column({ type: "integer" })
    apiKeyUserId: number;

    // API密钥名称
    @Column({ type: "varchar" })
    apiKeyName: string;

    // API密钥描述
    @Column({ type: "varchar", nullable: true })
    apiKeyDescription: string;

    // API密钥模型ID
    @Column({ type: "varchar" })
    apiKeyModelId: string;

    // API密钥知识库ID
    @Column({ type: "simple-array" })
    apiKeyKnowledgeBaseIds: string[];

    // API密钥是否启用
    @Column({ default: true })
    apiKeyEnabled: boolean;

    // API密钥过期时间
    @Column({ type: "timestamp", nullable: true })
    apiKeyExpiresAt: Date;

    // API密钥使用次数
    @Column({ default: 0 })
    apiKeyUsageCount: number;

    // API密钥最后使用时间
    @Column({ type: "timestamp", nullable: true })
    apiKeyLastUsedAt: Date;

    // API密钥创建时间
    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    apiKeyCreatedAt: Date;

    // API密钥更新时间
    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    apiKeyUpdatedAt: Date;
}

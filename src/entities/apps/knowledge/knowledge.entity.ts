import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Knowledge {

    // 知识库Id
    @PrimaryColumn({ type: "varchar" })
    KnowledgeId: string;

    // 知识库用户Id
    @Column({ type: "integer" })
    KnowledgeUserId: number;

    // 知识库名称
    @Column({ type: "varchar" })
    KnowledgeName: string;

    // 知识库头像URL
    @Column({ type: "varchar" })
    KnowledgeAvatarUrl: string;

    // 知识库简介
    @Column({ type: "varchar" })
    KnowledgeDescription: string;

    // 知识库创建时间
    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    KnowledgeCreateTime: Date;

    // 知识库更新时间
    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    KnowledgeUpdateTime: Date;

    // 知识库搜索最大token数
    @Column({ type: "integer", default: 20000 })
    KnowledgeSearchLimit: number;

    // 知识库搜索相似度限制
    @Column({ type: "float", default: 0.3 })
    KnowledgeSearchSimilarity: number;

    // 知识库搜索模式
    @Column({ type: "varchar", default: "mixedRecall" })
    KnowledgeSearchMode: string;

    // 知识库搜索是否使用问题优化
    @Column({ type: "boolean", default: false })
    KnowledgeQuestionOptimization: boolean;

    // 知识库搜索问题优化模型
    @Column({ type: "varchar", default: "glm-4-flash" })
    KnowledgeQuestionOptimizationModel: string;

    // 知识库搜索问题优化背景
    @Column({ type: "varchar", nullable: true })
    KnowledgeQuestionOptimizationBackground: string;

}
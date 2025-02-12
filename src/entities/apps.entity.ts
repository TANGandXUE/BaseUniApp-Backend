import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// 定义计费配置的接口
export interface CostConfigItem {
    billingMethod: string;  // 计费方式：'turn'(按次)/'token'(按token)/'minute'(按分钟)等
    cost: number;          // 单位花费
}

export interface AppCostConfig {
    [stage: string]: CostConfigItem;  // 每个阶段对应的计费配置
}

@Entity()
export class Apps {

    // 应用Id
    @PrimaryGeneratedColumn({ type: "integer" })
    AppId: number;

    // 应用Key
    @Column({ type: "varchar" })
    AppKey: string;

    // 应用别名
    @Column({ type: "varchar" })
    AppName: string;

    // 应用描述
    @Column({ type: "varchar" })
    AppDescription: string;

    // 应用Logo
    @Column({ type: "varchar" })
    AppLogo: string;

    // 应用首页背景样式
    @Column({ type: "varchar" })
    AppIndexBackground: string;

    // 应用首页按钮样式
    @Column({ type: "varchar" })
    AppIndexButton: string;

    // 应用所属类别
    @Column({ type: "varchar" })
    AppCategory: string;

    // 应用创建时间
    @Column({ type: "timestamp" })
    AppCreateTime: Date;

    // 应用状态 0: 私有 1: 公开
    @Column({ type: "integer" })
    AppStatus: number;

    // 应用所属用户ID
    @Column({ type: "integer" })
    AppUserId: number;

    // 应用的阶段计费配置
    @Column({ type: "json", nullable: true })
    AppCostConfig: AppCostConfig;
}
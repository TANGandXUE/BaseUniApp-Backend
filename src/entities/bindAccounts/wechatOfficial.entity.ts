import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class WechatOfficial {
    @PrimaryGeneratedColumn()
    id: number;

    // 关联的用户ID
    @Column({ type: "int" })
    wechatOfficialUserId: number;

    // 微信公众号UUID
    @Column({ type: "varchar", nullable: true })
    wechatOfficialUuid: string;

    // 公众号昵称
    @Column({ type: "varchar", nullable: true })
    wechatOfficialNickname: string;

    // 公众号头像URL
    @Column({ type: "varchar", nullable: true })
    wechatOfficialAvatar: string;

    // 公众号fakeid
    @Column({ type: "varchar", nullable: true })
    wechatOfficialFakeid: string;

    // 访问令牌
    @Column({ type: "varchar", nullable: true })
    wechatOfficialToken: string;

    // token过期时间
    @Column({ type: "timestamp", nullable: true })
    wechatOfficialTokenExpires: Date;

    // 绑定状态 (unbind, binding, scanned, authorizing, bound, failed)
    @Column({ type: "varchar", default: "unbind" })
    wechatOfficialStatus: string;

    // 创建时间
    @CreateDateColumn({ type: "timestamp" })
    wechatOfficialCreateTime: Date;

    // 最后更新时间
    @CreateDateColumn({ type: "timestamp" })
    wechatOfficialUpdateTime: Date;

    // 会话ID
    @Column({ type: "varchar", nullable: true })
    wechatOfficialSessionId: string;

    // 会话创建时间
    @Column({ type: "timestamp", nullable: true })
    wechatOfficialSessionCreateTime: Date;

    // 错误信息
    @Column({ type: "text", nullable: true })
    wechatOfficialErrorMessage: string;

    // 会话Cookie
    @Column({ type: "text", nullable: true })
    wechatOfficialCookies: string;
} 
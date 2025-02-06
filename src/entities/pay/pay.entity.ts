import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Pay {

    //付款者交易订单ID
    @PrimaryColumn()
    payerTradeId: string;

    //付款者id
    @Column({ type: "int" })
    payerId: number;

    //付款者付款金额
    @Column({ type: "float" })
    payerPayAmount: number;

    //付款者付款时间
    @CreateDateColumn({ type: "timestamp" })
    payerPayDate: Date;

    //获得积分
    @Column({ type: "int", nullable: true })
    pointsAmount: number;

    //积分过期时间
    @Column({ type: "bigint", nullable: true })
    pointsExpireInMs: number;

    //会员等级
    @Column({ type: "int", nullable: true })
    membershipLevel: number;

    //会员过期时间
    @Column({ type: "bigint", nullable: true })
    membershipExpireInMs: number;

    //高级功能
    @Column({ type: 'json', nullable: true })
    premiumFeatures: Array<{
        featureName: string;
        durationMs: number;
    }>;

    //付款者相关权益是否已实际添加到用户信息中
    //前端会来查询这个值，来判断是否支付成功
    @Column()
    payerHasAdded: boolean;

}
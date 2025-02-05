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

    //付款者增加点数
    @Column({ type: "int" })
    payerAddPoints: number;

    //付款者会员延长时间(天数)
    @Column({ type: "int" })
    payerAddExpireDate: number;

    //付款者会员等级增加
    @Column({ type: "int" })
    payerAddLevel: number;

    //付款者相关权益是否已实际添加到用户信息中
    //前端会来查询这个值，来判断是否支付成功
    @Column()
    payerHasAdded: boolean;

}
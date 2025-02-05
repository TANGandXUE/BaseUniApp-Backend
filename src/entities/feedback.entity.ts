import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Feedback {

    // 反馈Id
    @PrimaryGeneratedColumn({ type: "integer" })
    FeedbackId: number;

    // 反馈者Id
    @Column({ type: "integer" })
    FeedbackUserId: number;

    // 反馈者名称
    @Column({ type: "varchar" })
    FeedbackUserName: string;

    // 反馈者手机号
    @Column({ type: "varchar" })
    FeedbackUserPhone: string;

    // 反馈者邮箱
    @Column({ type: "varchar" })
    FeedbackUserEmail: string;

    // 反馈内容
    @Column({ type: "varchar" })
    FeedbackText: string;

}
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryInfo {

    //任务Id
    @PrimaryGeneratedColumn({ type: "int" })
    historyId: number;

    //用户Id
    @Column({ type: "int" })
    historyUserId: number;

    //使用的应用Id
    @Column({ type: "int" })
    historyAppId: number;

    //任务状态(processing, completed, failed)
    @Column({ type: "varchar" })
    historyStatus: string;

    //任务启动时间
    @CreateDateColumn({ type: "timestamp" })
    historyStartTime: Date;

    //任务耗时(毫秒)
    @Column({ type: "int" })
    historyUseTime: number;

    //任务消耗的点数
    @Column({ type: "int" })
    historyUsePoints: number;

    //任务结果
    @Column('json')
    historyResult: object[];

    //错误信息
    @Column('json')
    historyErrorInfos: object[];
}
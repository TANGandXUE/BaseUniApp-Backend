import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class WorkInfo {

    //工作Id
    @PrimaryColumn({ type: "varchar" })
    workId: string;

    //用户Id
    @Column({ type: "int" })
    workUserId: number;

    //使用的自然语言
    @Column({ type: "longtext" })
    workText: string;

    // 使用的API
    @Column('simple-array')
    workApiList: string[];

    //工作状态(processing, completed, failed)
    @Column({ type: "varchar" })
    workStatus: string;

    //工作启动时间
    @CreateDateColumn({ type: "timestamp" })
    workStartTime: Date;

    //工作耗时(毫秒)
    @Column({ type: "int" })
    workUseTime: number;

    //工作消耗的绘点
    @Column({ type: "int" })
    workUsePoints: number;

    //工作结果(链接)
    @Column('json')
    workResult: object[];

    //错误信息
    @Column('json')
    workErrorInfos: object[];

    //是否是生成预览图
    @Column({ type: "boolean" })
    isPreview: boolean;
    
    //压缩后的预览图(链接)
    @Column('json')
    workPreview: object[];

}
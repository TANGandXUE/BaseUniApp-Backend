import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ClonedVoice {

    // 克隆语音Id
    @PrimaryColumn({ type: "varchar" })
    ClonedVoiceId: string;

    // 克隆语音用户Id
    @Column({ type: "integer" })
    ClonedVoiceUserId: number;

    // 克隆语音名称
    @Column({ type: "varchar" })
    ClonedVoiceName: string;
    
    // 克隆语音创建时间
    @Column({ 
        type: "timestamp", 
        default: () => "CURRENT_TIMESTAMP" 
    })
    ClonedVoiceCreateTime: Date;

    // 克隆语音更新时间
    @Column({ 
        type: "timestamp", 
        default: () => "CURRENT_TIMESTAMP",
        onUpdate: "CURRENT_TIMESTAMP"
    })
    ClonedVoiceUpdateTime: Date;

}
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class AppInfo {
    @PrimaryColumn({ type: 'varchar', length: 50, comment: 'APP版本号' })
    version: string;

    @Column({ type: 'text', nullable: true, comment: '更新日志' })
    changelog: string;

    @Column({ type: 'varchar', length: 255, comment: 'APP下载地址' })
    downloadUrl: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', comment: '创建时间' })
    createdAt: Date;
}

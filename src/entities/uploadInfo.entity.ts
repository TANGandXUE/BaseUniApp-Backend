import { Entity, Column, CreateDateColumn, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UploadInfo {

    // 此数据表用于存储所有应用中用户上传的各类文件的链接。
    // 实际文件存储在OSS中，此表只存储文件的链接。

    //文件Id(也就是文件的唯一标识)
    @PrimaryGeneratedColumn({ type: "int" })
    uploadId: number;

    //文件所属应用Id
    @Column({ type: "int" })
    uploadAppId: number;

    //文件上传者Id(不是应用作者Id)
    @Column({ type: "int" })
    uploadUserId: number;

    //文件存储类别(用于区分同一个应用内，可能需要用到的不同文件种类，并不是文件格式)
    @Column({ type: "varchar" })
    uploadCategory: string;

    //文件存储名称
    @Column({ type: "varchar" })
    uploadName: string;

    //文件链接
    @Column({ type: "varchar" })
    uploadUrl: string;

    //文件上传时间
    @CreateDateColumn({ type: "timestamp" })
    uploadTime: Date;

}
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class ComponentAccessToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    appId: string;

    @Column({ nullable: false })
    accessToken: string;

    @Column({ nullable: false })
    expiresIn: number;

    @CreateDateColumn()
    createTime: Date;
} 
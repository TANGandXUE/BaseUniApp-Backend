import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class ComponentVerifyTicket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    appId: string;

    @Column()
    createTime: number;

    @Column()
    ticket: string;

    @CreateDateColumn()
    dbCreateTime: Date;
} 
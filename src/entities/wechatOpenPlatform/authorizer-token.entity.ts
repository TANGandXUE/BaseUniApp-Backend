import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class AuthorizerToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    authorizerAppid: string;

    @Column({ nullable: false })
    accessToken: string;

    @Column({ nullable: false })
    refreshToken: string;

    @Column({ nullable: false })
    expiresIn: number;

    @Column('simple-json', { nullable: true })
    funcInfo: { funcscope_category: { id: number } }[];

    @CreateDateColumn()
    createTime: Date;
} 
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserInfo } from './userinfo.entity';

@Entity()
export class SignIn {
    @PrimaryGeneratedColumn()
    signInId: number;

    @ManyToOne(() => UserInfo)
    user: UserInfo;

    @Column({ type: 'int' })
    pointsEarned: number;

    @Column({ type: 'date' })
    signInDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 
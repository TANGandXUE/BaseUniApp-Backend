import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { UserAssets } from './userAssets.entity';

@Entity()
export class UserPoints {
  @PrimaryGeneratedColumn()
  userPointsId: number;

  @Column({ type: "int" })
  userPointsAmount: number;

  @Column({ type: "timestamp" })
  userPointsExpireDate: Date;

  @ManyToOne(() => UserAssets, (user) => user.userPoints)
  user: UserAssets;
} 
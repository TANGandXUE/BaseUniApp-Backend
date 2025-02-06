import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { UserAssets } from './userAssets.entity';

@Entity()
export class UserMembership {
  @PrimaryGeneratedColumn()
  userMembershipId: number;

  @Column({ type: "int" }) // 改为数字类型等级
  userMembershipLevel: number;

  @Column({ type: "timestamp" })
  userMembershipExpireDate: Date;

  @ManyToOne(() => UserAssets, (user) => user.userMemberships)
  user: UserAssets;
} 
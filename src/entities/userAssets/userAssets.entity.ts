import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { UserPoints } from './userPoints.entity';
import { UserMembership } from './userMembership.entity';
import { UserPremiumFeature } from './userPremiumFeature.entity';
import { UserInfo } from '../userinfo.entity';

@Entity()
export class UserAssets {

  //用户id
  @PrimaryGeneratedColumn()
  userId: number;

  @OneToOne(() => UserInfo, user => user.assets)
  @JoinColumn({ name: "userId" })
  user: UserInfo;

  // 积分明细（一对多关系）
  @OneToMany(() => UserPoints, (points) => points.user)
  userPoints: UserPoints[];

  // 会员等级明细（一对多关系）
  @OneToMany(() => UserMembership, (membership) => membership.user)
  userMemberships: UserMembership[];

  // 高级功能明细（一对多关系）
  @OneToMany(() => UserPremiumFeature, (feature) => feature.user)
  userPremiumFeatures: UserPremiumFeature[];
}

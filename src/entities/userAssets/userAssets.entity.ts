import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { UserPoints } from './userPoints.entity';
import { UserMembership } from './userMembership.entity';
import { UserPremiumFeature } from './userPremiumFeature.entity';

@Entity()
export class UserAssets {

  //用户id
  @PrimaryColumn({ type: "int" })
  userId: number;

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

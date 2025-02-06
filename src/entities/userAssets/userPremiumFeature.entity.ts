import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { UserAssets } from './userAssets.entity';

@Entity()
export class UserPremiumFeature {
  @PrimaryGeneratedColumn()
  userPremiumFeatureId: number;

  @Column({ type: "varchar" }) // 功能名称（例如：AI_CHAT、PRO_DOWNLOAD）
  userPremiumFeatureName: string;

  @Column({ type: "timestamp" })
  userPremiumFeatureExpireDate: Date;

  @ManyToOne(() => UserAssets, (user) => user.userPremiumFeatures)
  user: UserAssets;
} 
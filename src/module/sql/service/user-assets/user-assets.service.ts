import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { UserPoints } from 'src/entities/userAssets/userPoints.entity';
import { UserMembership } from 'src/entities/userAssets/userMembership.entity';
import { UserPremiumFeature } from 'src/entities/userAssets/userPremiumFeature.entity';
import { MoreThan, LessThan } from 'typeorm';
import { UserInfo } from 'src/entities/userinfo.entity';

@Injectable()
export class UserAssetsService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(UserAssets)
    private userAssetsRepo: Repository<UserAssets>,
    @InjectRepository(UserPoints)
    private pointsRepo: Repository<UserPoints>,
    @InjectRepository(UserMembership)
    private membershipRepo: Repository<UserMembership>,
    @InjectRepository(UserPremiumFeature)
    private featureRepo: Repository<UserPremiumFeature>,
    @InjectRepository(UserInfo)
    private userInfoRepo: Repository<UserInfo>,
  ) { }

  // 初始化用户资产
  async initUserAssets(userId: number): Promise<UserAssets> {
    try {
      // 检查是否已存在
      const exists = await this.userAssetsRepo.findOne({
        where: { user: { userId } }
      });
      
      if (exists) {
        return exists;
      }

      // 创建新的资产记录
      const assets = this.userAssetsRepo.create({
        user: { userId }
      });

      const result = await this.userAssetsRepo.save(assets);
      console.log("用户资产初始化成功: ", result);
      return result;
    } catch (error) {
      console.error('初始化用户资产失败：', error);
      throw new Error('初始化用户资产失败：' + error.message);
    }
  }

  // 获取完整资产信息
  async getFullAssets(userId: number): Promise<UserAssets> {
    try {
      const assets = await this.userAssetsRepo.findOne({
        where: { user: { userId } },
        relations: [
          'user',
          'userPoints',
          'userMemberships',
          'userPremiumFeatures'
        ]
      });

      if (!assets) {
        throw new NotFoundException('用户资产不存在');
      }
      return assets;
    } catch (error) {
      console.error('获取用户资产失败：', error);
      throw new Error('获取用户资产失败：' + error.message);
    }
  }

  // 添加积分
  async addPoints(userId: number, amount: number, durationMs: number, manager?: EntityManager): Promise<UserPoints> {
    try {
      const repo = manager ? manager.getRepository(UserAssets) : this.userAssetsRepo;
      const pointsRepo = manager ? manager.getRepository(UserPoints) : this.pointsRepo;

      const assets = await repo.findOne({
        where: { user: { userId } },
        relations: ['user']
      });

      if (!assets) {
        throw new Error('用户资产不存在');
      }

      const expireDate = new Date(Date.now() + durationMs);

      const points = pointsRepo.create({
        userPointsAmount: amount,
        userPointsExpireDate: expireDate,
        user: assets
      });

      const result = await pointsRepo.save(points);
      console.log("积分添加成功: ", result);
      return result;
    } catch (error) {
      console.error('添加积分失败：', error);
      throw new Error('添加积分失败：' + error.message);
    }
  }

  // 消费积分
  async consumePoints(userId: number, amount: number): Promise<void> {
    return this.dataSource.transaction(async manager => {
      // 查询条件增加过期时间检查
      const points = await manager.find(UserPoints, {
        where: {
          user: { userId },
          userPointsExpireDate: MoreThan(new Date()) // 明确过滤过期
        },
        order: { userPointsExpireDate: 'ASC' }
      });

      // 计算总可用积分
      const total = points.reduce((sum, p) => sum + p.userPointsAmount, 0);
      if (total < amount) throw new Error('积分不足');

      // 按顺序扣除
      let remaining = amount;
      for (const p of points) {
        const deduct = Math.min(p.userPointsAmount, remaining);
        p.userPointsAmount -= deduct;
        remaining -= deduct;

        if (p.userPointsAmount === 0) {
          await manager.remove(p); // 完全扣除后删除记录
        } else {
          await manager.save(p); // 部分扣除后更新记录
        }

        if (remaining === 0) break;
      }
    });
  }

  // 查询积分
  async getAvailablePoints(userId: number): Promise<number> {
    const points = await this.pointsRepo
      .createQueryBuilder('p')
      .leftJoin('p.user', 'userAssets')
      .select('SUM(p.userPointsAmount)', 'total')
      .where('userAssets.userId = :userId', { userId })
      .andWhere('p.userPointsExpireDate > NOW()')
      .getRawOne();

    return parseInt(points?.total || '0', 10);
  }

  // 清除过期积分
  async clearExpiredPoints(): Promise<number> {
    const result = await this.pointsRepo
      .createQueryBuilder()
      .delete()
      .where('userPointsExpireDate <= NOW()')
      .execute();

    return result.affected || 0;
  }

  // 添加会员等级
  async addMembership(userId: number, level: number, durationMs: number): Promise<UserMembership[]> {
    return this.dataSource.transaction(async manager => {
      const assets = await this.getUserAssets(userId);
      const now = Date.now();
      // 定义TIMESTAMP上限: 2038-01-19T03:14:07.000Z
      const MAX_TIMESTAMP = new Date(2147483647 * 1000);

      // 处理当前等级
      const existing = await manager.findOne(UserMembership, {
        where: { user: { userId }, userMembershipLevel: level }
      });

      // 计算新到期时间
      const baseTime = existing?.userMembershipExpireDate.getTime() || now;
      let newExpiry = new Date(baseTime + durationMs);
      if (newExpiry.getTime() > MAX_TIMESTAMP.getTime()) {
        newExpiry = MAX_TIMESTAMP;
      }

      if (existing) {
        existing.userMembershipExpireDate = newExpiry;
        await manager.save(existing);
      } else {
        const newRecord = manager.create(UserMembership, {
          userMembershipLevel: level,
          userMembershipExpireDate: newExpiry,
          user: assets
        });
        await manager.save(newRecord);
      }

      // 获取需要延长的低等级有效会员
      const validLowerLevels = await manager.find(UserMembership, {
        where: {
          user: { userId },
          userMembershipLevel: LessThan(level),
          userMembershipExpireDate: MoreThan(new Date()) // 只处理未过期的
        }
      });

      // 延长有效低等级会员
      for (const record of validLowerLevels) {
        let lowerNewExpiry = new Date(record.userMembershipExpireDate.getTime() + durationMs);
        if (lowerNewExpiry.getTime() > MAX_TIMESTAMP.getTime()) {
          lowerNewExpiry = MAX_TIMESTAMP;
        }
        record.userMembershipExpireDate = lowerNewExpiry;
        await manager.save(record);
      }

      return manager.find(UserMembership, { where: { user: { userId } } });
    });
  }

  // 查询会员等级（完整，未过期）
  async getMembershipLevels(userId: number): Promise<Array<{
    userMembershipLevel: number;
    userMembershipExpireDate: Date;
  }>> {
    return this.membershipRepo.find({
      where: {
        user: { userId },
        userMembershipExpireDate: MoreThan(new Date())
      },
      select: ['userMembershipLevel', 'userMembershipExpireDate'],
      order: { userMembershipExpireDate: 'DESC' }
    });
  }

  // 查询当前有效的最高会员等级
  async getCurrentMembershipLevel(userId: number): Promise<number> {
    const membership = await this.membershipRepo.findOne({
      where: { 
        user: { userId }, 
        userMembershipExpireDate: MoreThan(new Date()) 
      },
      order: { userMembershipLevel: 'DESC' }
    });
    return membership?.userMembershipLevel || 0;
  }

  // 清除过期会员
  async clearExpiredMemberships(): Promise<number> {
    const result = await this.membershipRepo
      .createQueryBuilder()
      .delete()
      .where('userMembershipExpireDate <= NOW()')
      .execute();

    return result.affected || 0;
  }

  // 添加高级功能
  async addPremiumFeature(userId: number, featureName: string, durationMs: number): Promise<UserPremiumFeature> {
    return this.dataSource.transaction(async manager => {
      const assets = await this.getUserAssets(userId);
      const now = new Date();

      // 查找最新同名功能记录（包含过期）
      const existing = await manager.findOne(UserPremiumFeature, {
        where: {
          user: { userId },
          userPremiumFeatureName: featureName
        },
        order: { userPremiumFeatureExpireDate: 'DESC' }
      });

      let newExpiry: Date;
      // 定义TIMESTAMP上限: 2038-01-19T03:14:07.000Z
      const MAX_TIMESTAMP = new Date(2147483647 * 1000);

      if (existing) {
        // 判断是否过期
        if (existing.userPremiumFeatureExpireDate > now) {
          // 未过期：延长有效期
          newExpiry = new Date(existing.userPremiumFeatureExpireDate.getTime() + durationMs);
          console.log('durationMs: ', durationMs);
          console.log("未过期，延长有效期: ", newExpiry);
        } else {
          // 已过期：重置有效期
          newExpiry = new Date(now.getTime() + durationMs);
        }
        // 检查是否超过MySQL TIMESTAMP上限
        if (newExpiry.getTime() > MAX_TIMESTAMP.getTime()) {
          newExpiry = MAX_TIMESTAMP;
        }
        // 更新现有记录
        existing.userPremiumFeatureExpireDate = newExpiry;
        return manager.save(existing);
      }

      // 如果没有现有记录，创建新记录
      newExpiry = new Date(now.getTime() + durationMs);
      // 检查是否超过MySQL TIMESTAMP上限
      if (newExpiry.getTime() > MAX_TIMESTAMP.getTime()) {
        newExpiry = MAX_TIMESTAMP;
      }
      const feature = manager.create(UserPremiumFeature, {
        userPremiumFeatureName: featureName,
        userPremiumFeatureExpireDate: newExpiry,
        user: assets
      });

      return manager.save(feature);
    });
  }

  // 查询高级功能
  async getPremiumFeatures(userId: number): Promise<Array<{
    userPremiumFeatureName: string;
    userPremiumFeatureExpireDate: Date;
  }>> {
    return await this.featureRepo.find({
      where: { user: { userId } },
      select: ['userPremiumFeatureName', 'userPremiumFeatureExpireDate'],
      order: { userPremiumFeatureExpireDate: 'DESC' }
    });
  }

  // 清除过期高级功能
  async clearExpiredPremiumFeatures(): Promise<number> {
    const result = await this.featureRepo
      .createQueryBuilder()
      .delete()
      .where('userPremiumFeatureExpireDate <= NOW()')
      .execute();

    return result.affected || 0;
  }

  // 延长高级功能到期时间
  async extendFeatureExpiry(userId: number, featureId: number, durationMs: number): Promise<UserPremiumFeature> {
    const feature = await this.featureRepo.findOne({
      where: { userPremiumFeatureId: featureId, user: { userId } }
    });

    if (!feature) throw new NotFoundException('功能记录不存在');

    const newExpiry = new Date(feature.userPremiumFeatureExpireDate.getTime() + durationMs);
    feature.userPremiumFeatureExpireDate = newExpiry;

    return this.featureRepo.save(feature);
  }

  // 删除记录
  async removeRecord(
    repo: 'points' | 'membership' | 'feature',
    userId: number,
    recordId: number
  ): Promise<void> {
    const repositories = {
      points: this.pointsRepo,
      membership: this.membershipRepo,
      feature: this.featureRepo
    };

    const result = await repositories[repo].delete({
      [`user${repo.charAt(0).toUpperCase() + repo.slice(1)}Id`]: recordId,
      user: { userId }
    });

    if (result.affected === 0) throw new NotFoundException('记录不存在');
  }

  // 内部方法：获取资产
  private async getUserAssets(userId: number): Promise<UserAssets> {
    try {
      let assets = await this.userAssetsRepo.findOne({
        where: { user: { userId } },
        relations: ['user']
      });
      
      if (!assets) {
        assets = await this.initUserAssets(userId);
      }
      return assets;
    } catch (error) {
      console.error('获取用户资产失败：', error);
      throw new Error('获取用户资产失败：' + error.message);
    }
  }

  // 新增批量更新方法
  async updateAssets(
    userId: number,
    assetsData: {
      points?: UserPoints[];
      memberships?: UserMembership[];
      features?: UserPremiumFeature[];
    }
  ): Promise<void> {
    return this.dataSource.transaction(async manager => {
      // 更新积分
      if (assetsData.points) {
        await this.updatePoints(manager, userId, assetsData.points);
      }
      
      // 更新会员等级
      if (assetsData.memberships) {
        await this.updateMemberships(manager, userId, assetsData.memberships);
      }
      
      // 更新高级功能
      if (assetsData.features) {
        await this.updateFeatures(manager, userId, assetsData.features);
      }
    });
  }

  // 私有方法：更新积分
  private async updatePoints(
    manager: EntityManager,
    userId: number,
    points: UserPoints[]
  ) {
    // 删除旧记录
    await manager.delete(UserPoints, { user: { userId } });
    
    // 插入新记录
    const assets = await this.getUserAssets(userId);
    const newPoints = points.map(p => manager.create(UserPoints, {
      ...p,
      user: assets
    }));
    
    await manager.save(newPoints);
  }

  // 私有方法：更新会员等级（类似积分）
  private async updateMemberships(
    manager: EntityManager,
    userId: number,
    memberships: UserMembership[]
  ) {
    await manager.delete(UserMembership, { user: { userId } });
    
    const assets = await this.getUserAssets(userId);
    const newMemberships = memberships.map(m => manager.create(UserMembership, {
      ...m,
      user: assets
    }));
    
    await manager.save(newMemberships);
  }

  // 私有方法：更新高级功能（类似积分）
  private async updateFeatures(
    manager: EntityManager,
    userId: number,
    features: UserPremiumFeature[]
  ) {
    await manager.delete(UserPremiumFeature, { user: { userId } });
    
    const assets = await this.getUserAssets(userId);
    const newFeatures = features.map(f => manager.create(UserPremiumFeature, {
      ...f,
      user: assets
    }));
    
    await manager.save(newFeatures);
  }
}

import { Injectable } from '@nestjs/common';
import { UserInfo } from 'src/entities/userinfo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pay } from 'src/entities/pay/pay.entity';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { UserAssetsService } from '../user-assets/user-assets.service';
import { UserPoints } from 'src/entities/userAssets/userPoints.entity';
import { UserMembership } from 'src/entities/userAssets/userMembership.entity';
import { UserPremiumFeature } from 'src/entities/userAssets/userPremiumFeature.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        @InjectRepository(Pay)
        private readonly payRepository: Repository<Pay>,
        @InjectRepository(HistoryInfo)
        private readonly historyInfoRepository: Repository<HistoryInfo>,
        @InjectRepository(UserAssets)
        private readonly userAssetsRepository: Repository<UserAssets>,
        private readonly userAssetsService: UserAssetsService,
        private readonly dataSource: DataSource
    ) { }


    // 获取所有用户信息
    async getAllUserInfos() {
        try {
            return { isSuccess: true, message: '获取所有用户信息成功', data: await this.userInfoRepository.find() };
        } catch (error) {
            console.error('获取所有用户信息失败: ', error);
            return { isSuccess: false, message: '获取所有用户信息失败', data: {} };
        }
    }

    // 获取单个用户信息
    async getUserInfoById(userId: number): Promise<{
        isSuccess: boolean;
        message: string;
        data: any;
    }> {
        console.log('getUserInfoById userId: ', userId);
        try {
            const user = await this.userInfoRepository.findOne({ 
                where: { userId }
            });

            if (!user) {
                return { 
                    isSuccess: false, 
                    message: '用户不存在', 
                    data: null 
                };
            }

            // 获取完整资产信息
            const assets = await this.userAssetsService.getFullAssets(userId);

            return {
                isSuccess: true,
                message: '获取用户信息成功',
                data: {
                    ...user,
                    assets: {
                        points: assets.userPoints,
                        memberships: assets.userMemberships,
                        features: assets.userPremiumFeatures
                    }
                }
            };
        } catch (error) {
            console.error('获取用户信息失败：', error);
            return {
                isSuccess: false,
                message: '获取用户信息失败：' + error.message,
                data: null
            };
        }
    }

    // 获取分页所有用户信息
    async getPagedUserInfos(
        pageIndex: number,
        pageSize: number,
        prop: keyof UserInfo,
        order: "ascending" | "descending" | null,
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: any
    }> {
        try {
            // 参数验证
            const validColumns = this.userInfoRepository.metadata.columns.map(c => c.propertyName);
            if (!validColumns.includes(prop)) {
                return {
                    isSuccess: false,
                    message: `无效的排序字段: ${prop}`,
                    data: { userList: [], pageCount: 0, total: 0 }
                };
            }

            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.userInfoRepository.createQueryBuilder('userInfo');

            // 添加排序和分页
            query.orderBy(`userInfo.${prop}`, direction)
                .skip(skip)
                .take(pageSize);

            const [userList, total] = await query.getManyAndCount(); // 执行查询并获取结果及总数

            // 合并完整资产信息
            const mergedList = await Promise.all(
                userList.map(async (user) => {
                    const assets = await this.userAssetsService.getFullAssets(user.userId);
                    return {
                        ...user,
                        assets: {
                            points: assets.userPoints,
                            memberships: assets.userMemberships,
                            features: assets.userPremiumFeatures
                        }
                    };
                })
            );

            return {
                isSuccess: true,
                message: '获取分页用户信息成功',
                data: {
                    userList: mergedList,
                    pageCount: Math.ceil(total / pageSize),
                    total
                }
            }
        } catch (error) {
            console.error('获取分页用户信息失败：', error);
            return {
                isSuccess: false,
                message: '获取分页用户信息失败',
                data: { userList: [], pageCount: 0, total: 0 }
            }
        }
    }

    // 修改用户信息
    async updateUserInfo(
        userId: number,
        updateData: Partial<UserInfo & { assets?: any }>
    ) {
        return this.dataSource.transaction(async manager => {
            try {
                // 分离用户基本信息和资产信息
                const { assets, ...userInfoData } = updateData;

                // 更新用户基本信息
                const user = await manager.findOne(UserInfo, { where: { userId } });
                if (!user) throw new Error('用户不存在');

                await manager.update(UserInfo, userId, userInfoData);

                // 更新资产信息
                if (assets) {
                    await this.userAssetsService.updateAssets(userId, {
                        points: assets.points,
                        memberships: assets.memberships,
                        features: assets.features
                    });
                }

                // 获取更新后的完整数据
                const updatedUser = await manager.findOne(UserInfo, { 
                    where: { userId },
                    relations: ['assets']
                });

                // 获取完整资产信息
                const fullAssets = await this.userAssetsService.getFullAssets(userId);

                return {
                    isSuccess: true,
                    message: '用户信息更新成功',
                    data: {
                        ...updatedUser,
                        assets: fullAssets
                    }
                };
            } catch (error) {
                console.error('更新用户信息失败：', error);
                return {
                    isSuccess: false,
                    message: '更新用户信息失败：' + error.message,
                    data: null
                };
            }
        });
    }

    // 获取分页支付记录
    async getPagedPayRecords(
        pageIndex: number,                                                        // 页码
        pageSize: number,                                                         // 每页条目数
        prop: "payerPayDate" | "payerAddPoints" | "payerAddLevel",               // 排序字段
        order: "ascending" | "descending" | null,                                 // 升降序
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: {
            payList: Pay[],        // 支付记录列表
            pageCount: number,     // 总页数
            total: number,         // 总记录数
        }
    }> {
        try {
            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.payRepository.createQueryBuilder('pay');

            // 添加排序和分页
            query.orderBy(`pay.${prop}`, direction)
                .skip(skip)
                .take(pageSize);

            const [payList, total] = await query.getManyAndCount(); // 执行查询并获取结果及总数
            console.log('payList: ', payList);
            const pageCount = Math.ceil(total / pageSize); // 计算总页数

            return {
                isSuccess: true,
                message: '获取分页支付记录成功',
                data: { payList, pageCount, total }
            }
        } catch (error) {
            console.error('获取分页支付记录失败：', error);
            return {
                isSuccess: false,
                message: '获取分页支付记录失败',
                data: { payList: [], pageCount: 0, total: 0 }
            }
        }
    }

    // 获取分页历史记录
    async getPagedHistoryInfos(
        pageIndex: number,                                                                    // 页码
        pageSize: number,                                                                     // 每页条目数
        prop: "historyStartTime" | "historyUseTime" | "historyUsePoints" | "historyStatus",  // 排序字段
        order: "ascending" | "descending" | null,                                             // 升降序
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: {
            historyList: HistoryInfo[],  // 历史记录列表
            pageCount: number,           // 总页数
            total: number,               // 总记录数
        }
    }> {
        try {
            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.historyInfoRepository.createQueryBuilder('historyInfo');

            // 添加排序和分页
            query.orderBy(`historyInfo.${prop}`, direction)
                .skip(skip)
                .take(pageSize);

            const [historyList, total] = await query.getManyAndCount(); // 执行查询并获取结果及总数
            const pageCount = Math.ceil(total / pageSize); // 计算总页数

            return {
                isSuccess: true,
                message: '获取分页历史记录成功',
                data: { historyList, pageCount, total }
            }
        } catch (error) {
            console.error('获取分页历史记录失败：', error);
            return {
                isSuccess: false,
                message: '获取分页历史记录失败',
                data: { historyList: [], pageCount: 0, total: 0 }
            }
        }
    }
}

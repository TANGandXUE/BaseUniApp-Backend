import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { Apps } from 'src/entities/apps.entity';

@Injectable()
export class HistoryService {
    constructor(
        @InjectRepository(HistoryInfo)
        private readonly historyInfoRepository: Repository<HistoryInfo>,
        @InjectRepository(Apps)
        private readonly appsRepository: Repository<Apps>
    ) { }

    // 获取分页历史记录
    async getPagedHistoryInfos(
        historyUserId: number,                                                    // 用户ID
        pageIndex: number,                                                        // 页码
        pageSize: number,                                                         // 每页条目数
        prop: "historyStartTime" | "historyUsePoints" | "historyUseTime",        // 排序字段
        order: "ascending" | "descending" | null,                                 // 升降序
        historyAppIds?: number[],                                                 // 应用ID数组（可选）
        appCategories?: string[],                                                 // 应用分类数组（可选）
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: {
            historyList: HistoryInfo[],  // 历史记录列表
            pageCount: number,           // 总页数
        }
    }> {
        try {
            // 检查参数有效性：historyAppIds和appCategories不能同时提供
            if (historyAppIds?.length > 0 && appCategories?.length > 0) {
                return {
                    isSuccess: false,
                    message: '应用ID数组和应用分类数组不能同时使用',
                    data: { historyList: [], pageCount: 0 }
                }
            }

            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.historyInfoRepository.createQueryBuilder('historyInfo');

            // 用户ID筛选
            query.where('historyInfo.historyUserId = :historyUserId', { historyUserId });

            // 如果提供了应用ID数组，添加应用ID筛选
            if (historyAppIds?.length > 0) {
                query.andWhere('historyInfo.historyAppId IN (:...historyAppIds)', { historyAppIds });
            }

            // 如果提供了应用分类数组，通过appsRepository查询相关应用ID
            if (appCategories?.length > 0) {
                const appsWithCategories = await this.appsRepository.find({
                    where: { AppCategory: In(appCategories) }
                });
                
                if (appsWithCategories.length > 0) {
                    const appIds = appsWithCategories.map(app => app.AppId);
                    query.andWhere('historyInfo.historyAppId IN (:...appIds)', { appIds });
                } else {
                    // 如果没有找到任何符合条件的应用，返回空结果
                    return {
                        isSuccess: true,
                        message: '获取分页历史记录成功（指定分类下没有应用）',
                        data: { historyList: [], pageCount: 0 }
                    }
                }
            }

            // 添加排序和分页
            query.orderBy(`historyInfo.${prop}`, direction)
                .skip(skip)
                .take(pageSize);

            const [historyList, total] = await query.getManyAndCount(); // 执行查询并获取结果及总数
            const pageCount = Math.ceil(total / pageSize); // 计算总页数

            return {
                isSuccess: true,
                message: '获取分页历史记录成功',
                data: { historyList, pageCount }
            }
        } catch (error) {
            console.error('获取分页历史记录失败：', error);
            return {
                isSuccess: false,
                message: '获取分页历史记录失败',
                data: { historyList: [], pageCount: 0 }
            }
        }
    }
}

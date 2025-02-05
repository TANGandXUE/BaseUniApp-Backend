import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryInfo } from 'src/entities/historyInfo.entity';

@Injectable()
export class HistoryService {
    constructor(
        @InjectRepository(HistoryInfo)
        private readonly historyInfoRepository: Repository<HistoryInfo>
    ) { }

    // 获取分页历史记录
    async getPagedHistoryInfos(
        historyUserId: number,                                                    // 用户ID
        pageIndex: number,                                                        // 页码
        pageSize: number,                                                         // 每页条目数
        prop: "historyStartTime" | "historyUsePoints" | "historyUseTime",        // 排序字段
        order: "ascending" | "descending" | null,                                 // 升降序
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: {
            historyList: HistoryInfo[],  // 历史记录列表
            pageCount: number,           // 总页数
        }
    }> {
        try {
            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.historyInfoRepository.createQueryBuilder('historyInfo');

            // 只保留用户ID筛选
            query.where('historyInfo.historyUserId = :historyUserId', { historyUserId });

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

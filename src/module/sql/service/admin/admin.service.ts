import { Injectable } from '@nestjs/common';
import { UserInfo } from 'src/entities/userinfo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pay } from 'src/entities/pay/pay.entity';
import { HistoryInfo } from 'src/entities/historyInfo.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        @InjectRepository(Pay)
        private readonly payRepository: Repository<Pay>,
        @InjectRepository(HistoryInfo)
        private readonly historyInfoRepository: Repository<HistoryInfo>
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
    async getUserInfoById(userId: number) {
        return await this.userInfoRepository.findOne({ where: { userId } });
    }

    // 获取分页所有用户信息
    async getPagedUserInfos(
        pageIndex: number,                                                        // 页码
        pageSize: number,                                                         // 每页条目数
        prop: "userRegisterDate" | "userPoints" | "userLevel" | "userExpireDate", // 排序字段
        order: "ascending" | "descending" | null,                                 // 升降序
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: {
            userList: UserInfo[],   // 用户列表
            pageCount: number,      // 总页数
            total: number,          // 总记录数
        }
    }> {
        try {
            const skip = (pageIndex - 1) * pageSize; // 计算跳过的记录数
            const direction = order === 'ascending' ? 'ASC' : 'DESC'; // 转换排序方向

            // 使用 TypeORM 的 queryBuilder 来构建查询
            const query = this.userInfoRepository.createQueryBuilder('userInfo');

            // 添加排序和分页
            query.orderBy(`userInfo.${prop}`, direction)
                .skip(skip)
                .take(pageSize);

            const [userList, total] = await query.getManyAndCount(); // 执行查询并获取结果及总数
            const pageCount = Math.ceil(total / pageSize); // 计算总页数

            return {
                isSuccess: true,
                message: '获取分页用户信息成功',
                data: { userList, pageCount, total }
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
        updateData: Partial<UserInfo>
    ): Promise<{
        isSuccess: boolean,
        message: string,
        data: any
    }> {
        try {
            // 检查用户是否存在
            const user = await this.userInfoRepository.findOne({ where: { userId } });
            if (!user) {
                return {
                    isSuccess: false,
                    message: '用户不存在',
                    data: null
                };
            }

            // 执行更新操作
            const result = await this.userInfoRepository.update(userId, updateData);

            if (result.affected > 0) {
                // 获取更新后的用户数据
                const updatedUser = await this.userInfoRepository.findOne({ where: { userId } });
                return {
                    isSuccess: true,
                    message: '用户信息修改成功',
                    data: updatedUser
                };
            } else {
                return {
                    isSuccess: false,
                    message: '用户信息修改失败',
                    data: null
                };
            }
        } catch (error) {
            console.error('修改用户信息失败：', error);
            return {
                isSuccess: false,
                message: '修改用户信息失败：' + error.message,
                data: null
            };
        }
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

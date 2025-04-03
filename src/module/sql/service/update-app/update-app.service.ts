import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInfo } from 'src/entities/update-app/appInfo.entity';

@Injectable()
export class UpdateAppService {
    constructor(
        @InjectRepository(AppInfo)
        private readonly appInfoRepository: Repository<AppInfo>
    ) {}

    // 添加APP信息
    async addAppInfo(appInfo: AppInfo) {
        try {
            const result = await this.appInfoRepository.save(appInfo);
            return { isSuccess: true, message: 'APP信息添加成功', data: result };
        } catch (error) {
            return { isSuccess: false, message: '添加APP信息失败: ' + error.message, data: {} };
        }
    }

    // 获取单个APP信息
    async getAppInfo(version: string) {
        try {
            const result = await this.appInfoRepository.findOneBy({ version });
            if (result) {
                return { isSuccess: true, message: 'APP信息获取成功', data: result };
            } else {
                return { isSuccess: false, message: '未找到指定版本的APP信息', data: {} };
            }
        } catch (error) {
            return { isSuccess: false, message: '获取APP信息失败: ' + error.message, data: {} };
        }
    }

    // 获取所有APP信息
    async getAllAppInfo() {
        try {
            const result = await this.appInfoRepository.find({
                order: { version: 'DESC' } // 按版本号降序排序，最新版本在前
            });
            return { 
                isSuccess: result.length > 0, 
                message: result.length > 0 ? 'APP信息获取成功' : '暂无APP信息', 
                data: result 
            };
        } catch (error) {
            return { isSuccess: false, message: '获取APP信息列表失败: ' + error.message, data: [] };
        }
    }

    // 更新APP信息
    async updateAppInfo(version: string, updateData: Partial<AppInfo>) {
        try {
            // 移除主键字段，防止错误更新
            const { version: _, createdAt: __, ...filteredData } = updateData;
            
            const result = await this.appInfoRepository.update(version, filteredData);
            
            if (result.affected && result.affected > 0) {
                const updatedApp = await this.appInfoRepository.findOneBy({ version });
                return { isSuccess: true, message: 'APP信息更新成功', data: updatedApp };
            } else {
                return { isSuccess: false, message: '未找到指定版本的APP信息，更新失败', data: {} };
            }
        } catch (error) {
            return { isSuccess: false, message: '更新APP信息失败: ' + error.message, data: {} };
        }
    }

    // 删除APP信息
    async deleteAppInfo(version: string) {
        try {
            const result = await this.appInfoRepository.delete({ version });
            
            if (result.affected && result.affected > 0) {
                return { isSuccess: true, message: 'APP信息删除成功', data: { version } };
            } else {
                return { isSuccess: false, message: '未找到指定版本的APP信息，删除失败', data: {} };
            }
        } catch (error) {
            return { isSuccess: false, message: '删除APP信息失败: ' + error.message, data: {} };
        }
    }

    // 获取最新版本的APP信息
    async getLatestAppInfo() {
        try {
            const result = await this.appInfoRepository.find({
                order: { version: 'DESC' },
                take: 1
            });
            
            if (result.length > 0) {
                return { isSuccess: true, message: '获取最新APP信息成功', data: result[0] };
            } else {
                return { isSuccess: false, message: '暂无APP信息', data: {} };
            }
        } catch (error) {
            return { isSuccess: false, message: '获取最新APP信息失败: ' + error.message, data: {} };
        }
    }
}
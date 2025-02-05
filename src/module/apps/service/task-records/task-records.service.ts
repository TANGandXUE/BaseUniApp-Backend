import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryInfo } from 'src/entities/historyInfo.entity';

@Injectable()
export class TaskRecordsService {
    constructor(
        @InjectRepository(HistoryInfo)
        private historyInfoRepository: Repository<HistoryInfo>,
    ) {}

    // 写入任务记录
    async writeTaskRecord(historyInfo: Partial<HistoryInfo>): Promise<HistoryInfo> {
        return await this.historyInfoRepository.save(historyInfo);
    }

    // 更新任务记录
    async updateTaskRecord(historyInfo: Partial<HistoryInfo>) {
        const historyId = historyInfo.historyId; // 从partialInfo中解析出historyId
        await this.historyInfoRepository.update(historyId, historyInfo);
    }

    // 获取单个任务记录
    async getTaskRecordById(historyId: number) {
        return await this.historyInfoRepository.findOne({ where: { historyId } });
    }

    // 获取用户任务记录列表
    async getTaskRecordsByUserId(userId: number) {
        return await this.historyInfoRepository.find({ where: { historyUserId: userId } });
    }

    // 删除任务记录
    async deleteTaskRecord(historyId: string) {
        await this.historyInfoRepository.delete(historyId);
    }

    // 获取全部任务记录
    async getAllTaskRecords() {
        return await this.historyInfoRepository.find();
    }
}

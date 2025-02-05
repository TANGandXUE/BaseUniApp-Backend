import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from 'src/module/apps/service/app-list/app-list.service';

@Injectable()
export class FacefusionService {
    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService
    ) { }

    private readonly baseUrl = process.env.FACEFUSION_SERVICE_URL;

    /**
     * 轮询任务状态并更新记录
     */
    private async pollTaskStatus(jobId: string, historyId: number, user: {
        userId: number;
        userPhone: string;
        userEmail: string;
        userPoints: number;
    }, appId: number) {
        let retryCount = 0;
        const maxRetries = 100;
        const interval = 3000; // 3秒

        const poll = async () => {
            console.log(`[换脸任务${jobId}] 第${retryCount + 1}次查询状态，剩余${maxRetries - retryCount - 1}次`);

            if (retryCount >= maxRetries) {
                console.log(`[换脸任务${jobId}] 超过最大重试次数，任务超时`);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: maxRetries * interval,
                    historyErrorInfos: [{
                        errorMessage: '任务执行超时'
                    }]
                });
                return;
            }

            const responseData = await this.queryTaskStatus(jobId);
            if (!responseData.isSuccess) {
                console.log(`[换脸任务${jobId}] 查询失败: ${responseData.message}`);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: retryCount * interval,
                    historyErrorInfos: [responseData.message]
                });
                return;
            }

            const status = responseData.data.status;
            console.log(`[换脸任务${jobId}] 当前状态: ${status}`);

            if (status === 'completed') {
                console.log(`[换脸任务${jobId}] 任务成功完成`);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'success',
                    historyUseTime: retryCount * interval,
                    historyResult: [{
                        jobId,
                        status,
                        fileName: responseData.data.result.file_name,
                        videoUrl: responseData.data.result.file_url,
                        createdAt: responseData.data.created_at,
                        updatedAt: responseData.data.updated_at
                    }]
                });
                // 获取应用的计费配置
                const appList = await this.appListService.getPublicAppList();
                // console.log('appList: ');
                // console.log(appList);
                const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
                // console.log('appCostConfig: ');
                // console.log(appCostConfig);
                await this.sqlService.deductPointsWithCheck(user, appCostConfig.deepChange.cost);
                return;
            } else if (status === 'failed') {
                console.log(`[换脸任务${jobId}] 任务失败`);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: retryCount * interval,
                    historyErrorInfos: [{
                        errorMessage: '任务执行失败'
                    }]
                });
                return;
            }

            // 任务仍在处理中，继续轮询
            retryCount++;
            setTimeout(poll, interval);
        };

        // 开始轮询
        console.log(`[换脸任务${jobId}] 开始轮询任务状态`);
        poll();
    }

    /**
     * 提交换脸任务
     */
    async submitFaceSwapTask(
        params: {
            source_url: string;
            target_url: string;
        },
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number
    ): Promise<any> {
        try {
            // 检查余额是否充足
            const appList = await this.appListService.getPublicAppList();
            // console.log('appList: ');
            // console.log(appList);
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            // console.log('appCostConfig: ');
            // console.log(appCostConfig);     
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, appCostConfig.deepChange.cost);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null,
                }
            }

            const response = await axios.post(
                `${this.baseUrl}/api/face-swap/async`,
                params,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            );

            console.log('response: ');
            console.log(response);

            if (response.data.job_id) {
                // 写入任务记录
                const taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: appId,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: appCostConfig.deepChange.cost,
                    historyResult: [{ jobId: response.data.job_id }],
                    historyErrorInfos: []
                });

                // 开始轮询任务状态
                this.pollTaskStatus(response.data.job_id, taskRecord.historyId, user, appId);

                return {
                    isSuccess: true,
                    message: '提交换脸任务成功',
                    data: taskRecord.historyId,
                }
            } else {
                console.log('response: ');
                console.log(response);
                return {
                    isSuccess: false,
                    message: '提交换脸任务失败',
                    data: null,
                }
            }
        } catch (error) {
            console.log('error: ');
            console.error(error);
            return {
                isSuccess: false,
                message: `提交换脸任务失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 查询任务状态
     */
    private async queryTaskStatus(jobId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/face-swap/status/${jobId}`
            );

            return {
                isSuccess: true,
                message: '获取换脸任务状态成功',
                data: response.data
            }
        } catch (error) {
            return {
                isSuccess: false,
                message: `查询任务状态失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 从数据库查询任务状态
     */
    async queryTaskStatusFromSQL(taskId: string, userId: number): Promise<any> {
        try {
            return {
                isSuccess: true,
                message: '查询任务状态成功',
                data: await this.taskRecordsService.getTaskRecordById(Number(taskId))
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: `查询任务状态失败: ${error.message}`,
                data: null,
            }
        }
    }
}
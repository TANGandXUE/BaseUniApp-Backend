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
                console.log('responseData: ');
                console.log(responseData.data);

                // 获取应用的计费配置
                const appList = await this.appListService.getPublicAppList();
                const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;

                let pointsToDeduct = 0;

                // 获取视频时长（毫秒）
                const duration = responseData.data.duration;

                // 判断是图片换脸还是视频换脸
                if (duration === null) {
                    // 图片换脸 - 按次计费
                    const imageCost = appCostConfig?.deepChange_Image?.cost || 5; // 默认每次5点
                    pointsToDeduct = imageCost;
                    console.log(`[换脸任务${jobId}] 图片换脸任务，按次计费: ${pointsToDeduct}点`);
                } else {
                    // 视频换脸 - 按时长计费
                    const baseCostPerSecond = appCostConfig?.deepChange?.cost || 10; // 默认每秒10点
                    // 将duration从毫秒转换为秒，计算最终点数
                    const durationInSeconds = Math.ceil(duration / 1000);
                    pointsToDeduct = durationInSeconds * baseCostPerSecond;
                    console.log(`[换脸任务${jobId}] 视频换脸任务，按时长计费: ${durationInSeconds}秒 * ${baseCostPerSecond}点/秒 = ${pointsToDeduct}点`);
                }

                console.log(`[换脸任务${jobId}] 开始扣除用户点数:`, {
                    userId: user.userId,
                    duration,
                    pointsToDeduct,
                    appId
                });

                // 扣除点数
                const deductResult = await this.sqlService.deductPointsWithCheck(user, pointsToDeduct);
                console.log(`[换脸任务${jobId}] 扣除点数结果:`, deductResult);

                // 更新任务记录
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'success',
                    historyUseTime: retryCount * interval,
                    historyUsePoints: pointsToDeduct,
                    historyResult: [{
                        jobId,
                        status,
                        fileName: responseData.data.result.file_name,
                        fileUrl: responseData.data.result.file_url,
                        duration: duration,
                        createdAt: responseData.data.created_at,
                        updatedAt: responseData.data.updated_at
                    }]
                });

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
     * 获取视频文件时长
     * @param videoUrl 视频URL
     * @returns 视频信息
     */
    private async getVideoDuration(videoUrl: string): Promise<{ duration: number }> {
        try {
            // 获取视频文件头信息
            const response = await axios.head(videoUrl);
            const contentLength = response.headers['content-length'];
            const contentType = response.headers['content-type'];

            // 根据文件类型和大小粗略估算时长
            if (contentType && contentType.includes('video')) {
                if (contentLength) {
                    // 假设视频比特率为2Mbps = 250KB/s，估算公式: 文件大小(字节) / 250000 = 秒数
                    const fileSizeInBytes = parseInt(contentLength);
                    const bitRate = 250 * 1024; // 字节/秒
                    const duration = fileSizeInBytes / bitRate;
                    return { duration };
                }
            }

            // 如果无法通过头信息估算，返回默认值
            return { duration: 30 }; // 默认30秒
        } catch (error) {
            console.error(`获取视频时长失败:`, error);
            // 出错时返回默认值
            return { duration: 30 };
        }
    }

    /**
     * 预估所需点数
     * @param params 任务参数
     * @param appId 应用ID
     * @returns 预估结果
     */
    private async estimatePointsNeeded(params: any, appId: number): Promise<{
        isSuccess: boolean;
        message: string;
        data: {
            estimatedDuration: number; // 预估时长(秒)
            pointsNeeded: number; // 所需点数
            baseCostPerSecond: number; // 每秒点数
            isImageTask: boolean; // 是否为图片任务
        } | null;
    }> {
        try {
            // 获取应用的计费配置
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const baseCostPerSecond = appCostConfig?.deepChange?.cost || 10; // 默认每秒10点
            const imageCost = appCostConfig?.deepChange_Image?.cost || 5; // 默认每次5点

            // 判断是否为图片任务
            const isImageTask = this.isImageUrl(params.target_url);
            console.log(`[点数预估] 目标URL: ${params.target_url}, 是否为图片任务: ${isImageTask}`);

            let estimatedDuration = 0; // 预估时长(秒)
            let pointsNeeded = 0; // 预估点数

            if (isImageTask) {
                // 图片换脸 - 按次计费
                pointsNeeded = imageCost;
                console.log(`[点数预估] 图片换脸任务，按次计费: ${pointsNeeded}点`);
            } else {
                // 视频换脸 - 按时长计费
                // 尝试从target_url获取视频时长
                if (params.target_url) {
                    try {
                        const videoInfo = await this.getVideoDuration(params.target_url);
                        estimatedDuration = Math.ceil(videoInfo.duration);
                        console.log(`[点数预估] 视频URL，获取到视频时长: ${estimatedDuration}秒`);
                    } catch (error) {
                        console.error(`[点数预估] 获取视频时长失败:`, error);
                        // 视频时长获取失败，使用默认预估：30秒
                        estimatedDuration = 30;
                        console.log(`[点数预估] 使用默认视频时长: ${estimatedDuration}秒`);
                    }
                } else {
                    // 无法预估，使用默认值
                    estimatedDuration = 30;
                    console.log(`[点数预估] 无视频URL，使用默认时长: ${estimatedDuration}秒`);
                }

                // 计算预估所需点数
                pointsNeeded = Math.ceil(estimatedDuration * baseCostPerSecond);
                console.log(`[点数预估] 视频换脸任务，按时长计费: ${estimatedDuration}秒 * ${baseCostPerSecond}点/秒 = ${pointsNeeded}点`);
            }

            return {
                isSuccess: true,
                message: '预估点数计算成功',
                data: {
                    estimatedDuration,
                    pointsNeeded,
                    baseCostPerSecond,
                    isImageTask
                }
            };
        } catch (error) {
            console.error('[点数预估] 预估所需点数失败:', error);
            return {
                isSuccess: false,
                message: `预估所需点数失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 判断URL是否为图片
     * @param url 
     * @returns 是否为图片
     */
    private isImageUrl(url: string): boolean {
        if (!url) return false;

        // 通过URL扩展名判断
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const urlLower = url.toLowerCase();

        // 检查URL是否以某个图片扩展名结尾
        return imageExtensions.some(ext => urlLower.endsWith(ext)) ||
            // 或者URL包含图片类型参数
            urlLower.includes('image/');
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
        console.log('提交换脸任务：', params);
        try {
            // 预估所需点数
            const estimateResult = await this.estimatePointsNeeded(params, appId);
            if (!estimateResult.isSuccess) {
                return estimateResult;
            }

            // 检查余额是否充足
            const pointsNeeded = estimateResult.data.pointsNeeded;
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, pointsNeeded);
            if (!isPointsEnough.isSuccess) {
                const taskType = estimateResult.data.isImageTask ? '图片换脸' : '视频换脸';
                const costDetail = estimateResult.data.isImageTask
                    ? `每次${pointsNeeded}点`
                    : `预估视频时长${estimateResult.data.estimatedDuration}秒，每秒${estimateResult.data.baseCostPerSecond}点`;

                return {
                    isSuccess: false,
                    message: `余额不足，预估需要${pointsNeeded}点数（${taskType}，${costDetail}）`,
                    data: {
                        estimatedDuration: estimateResult.data.estimatedDuration,
                        pointsNeeded: pointsNeeded,
                        baseCostPerSecond: estimateResult.data.baseCostPerSecond,
                        isImageTask: estimateResult.data.isImageTask,
                        userPoints: user.userPoints
                    }
                }
            }

            console.log('params: ');
            console.log(params);

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
                    historyUsePoints: 0, // 初始不扣费，等任务完成后按实际时长扣费
                    historyResult: [{
                        jobId: response.data.job_id,
                        estimatedDuration: estimateResult.data.estimatedDuration,
                        estimatedPoints: pointsNeeded,
                        isImageTask: estimateResult.data.isImageTask,
                        taskType: estimateResult.data.isImageTask ? '图片换脸' : '视频换脸'
                    }],
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
            console.error(error.message);
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
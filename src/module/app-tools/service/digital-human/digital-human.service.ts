import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from 'src/module/apps/service/app-list/app-list.service';
// 定义接口类型
export interface TTSParams {
    person?: string;
    speed?: string;
    volume?: string;
    pitch?: string;
}

export interface SubmitTaskResponse {
    taskId: string;
    status: string | null;
    failedCode: number;
    failedMessage: string | null;
    videoUrl: string | null;
    duration: number;
    createTime: string | null;
    updateTime: string | null;
    subtitleFileUrl: string | null;
}

export interface TaskStatus {
    taskId: string;
    status: 'SUBMIT' | 'GENERATING' | 'SUCCESS' | 'FAILED';
    failedCode?: number;
    failedMessage?: string;
    videoUrl?: string;
    duration?: number;
    subtitleFileUrl?: string;
    createTime: string;
    updateTime: string;
}

@Injectable()
export class DigitalHumanService {
    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService
    ) { }

    private readonly baseUrl = 'https://open.xiling.baidu.com';
    private readonly appId = process.env.BAIDU_DIGITAL_HUMAN_APP_ID;
    private readonly appKey = process.env.BAIDU_DIGITAL_HUMAN_APP_KEY;
    private readonly expireTime = process.env.BAIDU_DIGITAL_HUMAN_EXPIRE_TIME || '2099-12-31T23:59:59+08:00';

    /**
     * 生成鉴权参数
     */
    private generateAuthToken(): string {
        const hmac = crypto.createHmac('sha256', this.appKey);
        const data = this.appId + this.expireTime;
        const signature = hmac.update(data).digest('hex');
        return `${this.appId}/${signature}/${this.expireTime}`;
    }

    /**
     * 获取通用请求头
     */
    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json;charset=utf-8',
            'Authorization': this.generateAuthToken()
        };
    }

    /**
     * 轮询任务状态并更新记录
     */
    private async pollTaskStatus(taskId: string, historyId: number, user: {
        userId: number;
        userPhone: string;
        userEmail: string;
        userPoints: number;
    }, appId: number) {
        let retryCount = 0;
        const maxRetries = 100;
        const interval = 3000; // 3秒

        const poll = async () => {
            console.log(`[数字人任务${taskId}] 第${retryCount + 1}次查询状态，剩余${maxRetries - retryCount - 1}次`);

            if (retryCount >= maxRetries) {
                console.log(`[数字人任务${taskId}] 超过最大重试次数，任务超时`);
                // 超过最大重试次数
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

            // 根据不同的appId使用不同的查询方法
            let responseData;
            try {
                if (appId === 1) {
                    responseData = await this.img_queryTaskStatus(taskId);
                } else if (appId === 2) {
                    responseData = await this.vip_queryTaskStatus(taskId);
                } else if (appId === 7) {
                    responseData = await this.adv_queryTaskStatus(taskId);
                }

                if (!responseData.isSuccess) {
                    console.log(`[数字人任务${taskId}] 查询失败: ${responseData.message}，详细信息:`, JSON.stringify(responseData));
                    // 查询失败
                    await this.taskRecordsService.updateTaskRecord({
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: retryCount * interval,
                        historyErrorInfos: [{
                            errorMessage: `任务查询失败: ${responseData.message}`,
                            errorDetails: JSON.stringify(responseData)
                        }]
                    });
                    return;
                }

                const status = responseData.data.status;
                console.log(`[数字人任务${taskId}] 当前状态: ${status}`);

                if (status === 'SUCCESS') {
                    console.log(`[数字人任务${taskId}] 任务成功完成`);
                    // 任务成功
                    await this.taskRecordsService.updateTaskRecord({
                        historyId,
                        historyStatus: 'success',
                        historyUseTime: retryCount * interval,
                        historyResult: [{
                            taskId,
                            status,
                            videoUrl: responseData.data.videoUrl,
                            duration: responseData.data.duration,
                            subtitleFileUrl: responseData.data.subtitleFileUrl
                        }]
                    });
                    // 获取应用的计费配置
                    const appList = await this.appListService.getPublicAppList();
                    const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
                    // 扣除点数
                    console.log(await this.sqlService.deductPointsWithCheck(user, appCostConfig.generateVideo.cost));
                    return;
                } else if (status === 'FAILED') {
                    console.log(`[数字人任务${taskId}] 任务失败: ${responseData.data.failedMessage || '未知错误'}`);
                    // 任务失败
                    await this.taskRecordsService.updateTaskRecord({
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: retryCount * interval,
                        historyErrorInfos: [{
                            errorMessage: responseData.data.failedMessage || '任务执行失败',
                            errorCode: responseData.data.failedCode,
                            errorDetails: JSON.stringify(responseData.data)
                        }]
                    });
                    return;
                }
            } catch (error) {
                console.log(`[数字人任务${taskId}] 查询出错:`, error);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: retryCount * interval,
                    historyErrorInfos: [{
                        errorMessage: `任务查询异常: ${error.message}`,
                        errorDetails: error.stack
                    }]
                });
                return;
            }

            // 任务仍在处理中，继续轮询
            retryCount++;
            setTimeout(poll, interval);
        };

        // 开始轮询
        console.log(`[数字人任务${taskId}] 开始轮询任务状态`);
        poll();
    }

    /**
     * 图片数字人-提交视频任务
     */
    async img_submitVideoTask(
        params: {
            inputImageUrl: string;
            driveType?: 'TEXT' | 'VOICE';
            text?: string;
            ttsParams?: TTSParams;
            inputAudioUrl?: string;
            callbackUrl?: string;
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
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, appCostConfig.generateVideo.cost);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null,
                }
            }

            const response = await axios.post(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/image/submit`,
                {
                    ...params,
                    driveType: params.driveType || 'TEXT',
                },
                {
                    headers: this.getHeaders(),
                },
            );

            if (response.data.code === 0) {
                // 写入任务记录
                const taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 1,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: appCostConfig.generateVideo.cost,
                    historyResult: [{ taskId: response.data.result.taskId }],
                    historyErrorInfos: []
                });

                // 开始轮询任务状态
                this.pollTaskStatus(response.data.result.taskId, taskRecord.historyId, user, appId);

                return {
                    isSuccess: true,
                    message: '提交图片数字人合成任务成功',
                    data: taskRecord.historyId,
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
            }
        } catch (error) {
            return {
                isSuccess: false,
                message: `提交视频合成任务失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 图片数字人-从百度API查询任务状态
     */
    private async img_queryTaskStatus(taskId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/image/task`,
                {
                    params: { taskId },
                    headers: this.getHeaders(),
                },
            );

            if (response.data.code === 0) {
                return {
                    isSuccess: true,
                    message: '获取图片数字人合成任务状态成功',
                    data: response.data.result
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
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
     * 图片数字人-从数据库查询任务状态
     */
    async img_queryTaskStatusFromSQL(taskId: string, userId: number): Promise<any> {
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

    /**
     * 精品数字人-提交视频任务
     */
    async vip_submitVideoTask(params: {
        figureId: string;
        driveType?: 'TEXT' | 'VOICE';
        text?: string;
        ttsParams?: TTSParams;
        inputAudioUrl?: string;
        videoParams: {
            width: number;
            height: number;
            transparent?: boolean;
        };
        dhParams?: {
            cameraId?: number;
            position?: {
                x?: number;
                y?: number;
                z?: number;
            };
        };
        subtitleParams?: {
            subtitlePolicy?: string;
            enabled?: boolean;
        };
        backgroundImageUrl?: string;
        callbackUrl?: string;
        autoAnimoji?: boolean;
        enablePalindrome?: boolean;
    }, user: {
        userId: number;
        userPhone: string;
        userEmail: string;
        userPoints: number;
    }, appId: number
    ): Promise<any> {
        // 检查余额是否充足
        const appList = await this.appListService.getPublicAppList();
        const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
        const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, appCostConfig.generateVideo.cost);
        console.log('isPointsEnough', isPointsEnough);
        if (!isPointsEnough.isSuccess) {
            return {
                isSuccess: false,
                message: '余额不足',
                data: null,
            }
        }
        console.log('params', 1);
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/submit`,
                {
                    ...params,
                    driveType: params.driveType || 'TEXT',
                },
                {
                    headers: this.getHeaders(),
                },
            );

            if (response.data.code === 0) {
                // 写入任务记录
                const taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 2, // 精品数字人的historyAppId是2
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: appCostConfig.generateVideo.cost,
                    historyResult: [{ taskId: response.data.result.taskId }],
                    historyErrorInfos: []
                });

                // 开始轮询任务状态
                this.pollTaskStatus(response.data.result.taskId, taskRecord.historyId, user, appId);

                return {
                    isSuccess: true,
                    message: '提交精品数字人合成任务成功',
                    data: taskRecord.historyId,
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
            }
        } catch (error) {
            return {
                isSuccess: false,
                message: `提交视频合成任务失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 精品数字人-从百度API查询任务状态
     */
    private async vip_queryTaskStatus(taskId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/task`,
                {
                    params: { taskId },
                    headers: this.getHeaders(),
                },
            );

            if (response.data.code === 0) {
                return {
                    isSuccess: true,
                    message: '获取精品数字人合成任务状态成功',
                    data: response.data.result
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
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
     * 精品数字人-从数据库查询任务状态
     */
    async vip_queryTaskStatusFromSQL(taskId: string, userId: number): Promise<any> {
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

    /**
     * 高级数字人-提交视频任务
     */
    async adv_submitVideoTask(params: {
        figureId: string;
        templateId: string;
        driveType?: 'TEXT' | 'VOICE';
        text?: string;
        inputAudioUrl?: string;
        title?: string;
        logoParams?: {
            logoUrl: string;
        };
        bgmParams?: {
            bgmUrl: string;
        };
        materialUrl?: string;
        ttsParams?: TTSParams;
        videoParams: {
            width: number;
            height: number;
        };
        riskTip?: string;
        openingMaterial?: {
            fileId?: string;
            fileUrl?: string;
            mediaType: 'VIDEO';
        };
        endingMaterial?: {
            fileId?: string;
            fileUrl?: string;
            mediaType: 'VIDEO';
        };
        mashupMaterials?: Array<{
            fileId?: string;
            fileUrl?: string;
            mediaType: 'VIDEO' | 'IMAGE';
        }>;
        fissionParams?: {
            figureIds: string[];
            ttsPersons?: string[];
        };
        callbackUrl?: string;
    }, user: {
        userId: number;
        userPhone: string;
        userEmail: string;
        userPoints: number;
    }, appId: number): Promise<any> {
        try {
            // 检查余额是否充足
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, appCostConfig.generateVideo.cost);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null,
                }
            }

            // 如果有裂变参数，需要计算总共需要的点数
            if (params.fissionParams) {
                const totalTasks = params.fissionParams.figureIds.length * (params.fissionParams.ttsPersons?.length || 1);
                const totalPoints = appCostConfig.generateVideo.cost * totalTasks;
                const isEnoughForAll = await this.sqlService.isPointsEnoughByUserId(user.userId, totalPoints);
                if (!isEnoughForAll.isSuccess) {
                    return {
                        isSuccess: false,
                        message: `余额不足，裂变任务需要 ${totalPoints} 点数`,
                        data: null,
                    }
                }
            }

            const response = await axios.post(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/advanced/submit`,
                {
                    ...params,
                    driveType: params.driveType || 'TEXT',
                },
                {
                    headers: this.getHeaders(),
                },
            );

            console.log('高级数字人API返回数据:', JSON.stringify(response.data, null, 2));

            if (response.data.code === 0) {
                const historyIds = [];
                // 处理裂变任务
                if (response.data.result.fissionTasks && response.data.result.fissionTasks.length > 0) {
                    // 记录成功和失败的任务
                    const successTasks = [];
                    const failedTasks = [];
                    
                    for (const task of response.data.result.fissionTasks) {
                        if (task.code === 0) {
                            successTasks.push(task);
                        } else {
                            failedTasks.push(task);
                        }
                    }

                    // 处理成功的任务
                    for (const task of successTasks) {
                        const taskRecord = await this.taskRecordsService.writeTaskRecord({
                            historyUserId: user.userId,
                            historyAppId: 7,
                            historyStatus: 'processing',
                            historyStartTime: new Date(),
                            historyUseTime: 0,
                            historyUsePoints: appCostConfig.generateVideo.cost,
                            historyResult: [{
                                taskId: task.taskId,
                                figureId: task.figureId,
                                ttsPerson: task.ttsPerson
                            }],
                            historyErrorInfos: []
                        });

                        historyIds.push(taskRecord.historyId);
                        // 开始轮询任务状态
                        this.pollTaskStatus(task.taskId, taskRecord.historyId, user, appId);
                    }

                    // 处理失败的任务
                    for (const task of failedTasks) {
                        const taskRecord = await this.taskRecordsService.writeTaskRecord({
                            historyUserId: user.userId,
                            historyAppId: 7,
                            historyStatus: 'failed',
                            historyStartTime: new Date(),
                            historyUseTime: 0,
                            historyUsePoints: 0,
                            historyResult: [{
                                taskId: null,
                                figureId: task.figureId,
                                ttsPerson: task.ttsPerson
                            }],
                            historyErrorInfos: [{
                                errorMessage: task.code === 50001 ? 
                                    '服务商系统额度不足，请稍后再试' : 
                                    task.message,
                                errorCode: task.code,
                                errorDetails: JSON.stringify(task)
                            }]
                        });
                        historyIds.push(taskRecord.historyId);
                    }

                    // 返回处理结果
                    let message = '提交高级数字人合成任务';
                    if (successTasks.length > 0 && failedTasks.length > 0) {
                        message += `部分成功（成功${successTasks.length}个，失败${failedTasks.length}个）`;
                    } else if (successTasks.length > 0) {
                        message += '成功';
                    } else {
                        message += '失败';
                    }

                    if (failedTasks.some(task => task.code === 50001)) {
                        message += '，部分任务因服务商系统额度不足而失败';
                    }

                    return {
                        isSuccess: successTasks.length > 0,
                        message,
                        data: historyIds
                    }
                } else if (response.data.result.taskId) {
                    // 写入单个任务记录
                    const taskRecord = await this.taskRecordsService.writeTaskRecord({
                        historyUserId: user.userId,
                        historyAppId: 7,
                        historyStatus: 'processing',
                        historyStartTime: new Date(),
                        historyUseTime: 0,
                        historyUsePoints: appCostConfig.generateVideo.cost,
                        historyResult: [{ taskId: response.data.result.taskId }],
                        historyErrorInfos: []
                    });

                    historyIds.push(taskRecord.historyId);
                    // 开始轮询任务状态
                    this.pollTaskStatus(response.data.result.taskId, taskRecord.historyId, user, appId);
                }

                return {
                    isSuccess: true,
                    message: '提交高级数字人合成任务成功',
                    data: historyIds
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
            }
        } catch (error) {
            console.error('高级数字人提交任务出错:', error);
            return {
                isSuccess: false,
                message: `提交视频合成任务失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 高级数字人-从百度API查询任务状态
     */
    private async adv_queryTaskStatus(taskId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/digitalhuman/open/v1/video/advanced/task`,
                {
                    params: { taskId },
                    headers: this.getHeaders(),
                },
            );

            if (response.data.code === 0) {
                return {
                    isSuccess: true,
                    message: '获取高级数字人合成任务状态成功',
                    data: response.data.result
                }
            } else {
                return {
                    isSuccess: false,
                    message: response.data.message.global,
                    data: null,
                }
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
     * 高级数字人-从数据库查询任务状态
     */
    async adv_queryTaskStatusFromSQL(taskId: string, userId: number): Promise<any> {
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

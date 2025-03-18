import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from '../../../apps/service/app-list/app-list.service';
import { OssService } from '../../../sql/service/oss/oss.service';
import * as workflowConfig from './workflow/ltxvideo-t2v.json';

// 任务执行结果类型
interface TaskResult {
    jobId: string;
    status: string;
    outputUrl?: string;
    prompt?: string;
    createdAt: string;
    updatedAt: string;
}

// 错误信息类型
interface ErrorInfo {
    errorMessage: string;
    errorDetails?: any;
}

@Injectable()
export class LtxvideoService {
    private readonly logger = new Logger(LtxvideoService.name);
    private readonly COMFYUI_API = process.env.COMFYUI_SERVICE_URL || 'http://127.0.0.1:8188';
    private readonly POLL_INTERVAL = Number(process.env.LTXVIDEO_POLL_INTERVAL || 3000);
    private readonly MAX_RETRIES = Number(process.env.LTXVIDEO_MAX_RETRIES || 1000);
    private readonly TEMP_DIR = process.env.LTXVIDEO_TEMP_DIR || 'temp/ltxvideo';
    private readonly POINTS_PER_TASK = Number(process.env.LTXVIDEO_POINTS_PER_TASK || 300);

    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService,
        private readonly ossService: OssService
    ) {
        // 确保临时目录存在
        if (!fs.existsSync(this.TEMP_DIR)) {
            fs.mkdirSync(this.TEMP_DIR, { recursive: true });
        }
    }

    // 清理临时文件
    private async cleanupFiles(files: string[]) {
        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                }
            } catch (error) {
                this.logger.error(`删除文件 ${file} 失败:`, error);
            }
        }
    }

    // 准备工作流配置
    private prepareWorkflowConfig(prompt: string) {
        try {
            // 处理工作流配置
            const workflow = ('default' in workflowConfig) ? workflowConfig.default : workflowConfig;

            // 更新工作流中的文本输入节点 (86号节点)
            workflow['86'].inputs.prompt = prompt;

            return workflow;
        } catch (error) {
            throw new Error(`准备工作流配置失败: ${error.message}`);
        }
    }

    // 提交任务到ComfyUI
    private async submitToComfyUI(workflow: any): Promise<string> {
        try {
            const requestBody = {
                prompt: workflow,
                client_id: `ltxvideo_${Date.now()}`,
                extra_data: {
                    required_outputs: [{
                        node_id: 88,
                        output_name: "video"
                    }]
                }
            };

            const response = await axios.post(`${this.COMFYUI_API}/prompt`, requestBody);
            return response.data.prompt_id;
        } catch (error) {
            if (error.response?.data) {
                throw new Error(`提交任务到ComfyUI失败: ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`提交任务到ComfyUI失败: ${error.message}`);
        }
    }

    // 查询任务状态
    private async queryComfyUIStatus(promptId: string): Promise<{
        status: string;
        completed: boolean;
        outputPath?: string;
        error?: string;
    }> {
        try {
            const response = await axios.get(`${this.COMFYUI_API}/history/${promptId}`);
            
            if (Object.keys(response.data).length === 0) {
                return {
                    status: 'processing',
                    completed: false
                };
            }

            const history = response.data[promptId];
            if (!history) {
                return {
                    status: 'failed',
                    completed: true,
                    error: '任务未找到'
                };
            }

            // 检查执行状态
            if (history.status?.status_str === 'error') {
                this.logger.error(`任务${promptId}执行出错:`, history.status.message);
                return {
                    status: 'failed',
                    completed: true,
                    error: JSON.stringify(history.status?.message || '未知错误')
                };
            }

            // 获取任务完成状态
            const isCompleted = history.status?.completed === true;

            // 如果任务已完成，检查输出
            if (isCompleted) {
                this.logger.log(`任务${promptId}已完成，开始查找输出`);
                
                // 检查输出节点是否存在
                if (!history.outputs) {
                    this.logger.warn(`任务${promptId}没有outputs字段`);
                    return {
                        status: 'failed',
                        completed: true,
                        error: '任务完成但没有输出结果'
                    };
                }

                // 记录所有输出节点用于调试
                this.logger.log(`任务${promptId}的outputs节点:`, JSON.stringify(history.outputs));
                
                // 检查节点88的输出
                const node88Output = history.outputs['88'];
                if (node88Output) {
                    this.logger.log(`找到节点88的输出:`, JSON.stringify(node88Output));
                    
                    // 节点88的输出可能在gifs数组中（ComfyUI的一种特殊处理方式）
                    if (node88Output.gifs && node88Output.gifs.length > 0) {
                        // 优先使用fullpath，这是绝对路径
                        const outputPath = node88Output.gifs[0].fullpath;
                        this.logger.log(`在gifs数组中找到输出路径:`, outputPath);
                        return {
                            status: 'completed',
                            completed: true,
                            outputPath
                        };
                    }
                    
                    // 也检查videos数组
                    if (node88Output.videos && node88Output.videos.length > 0) {
                        const outputPath = node88Output.videos[0].fullpath;
                        this.logger.log(`在videos数组中找到输出路径:`, outputPath);
                        return {
                            status: 'completed',
                            completed: true,
                            outputPath
                        };
                    }
                }

                // 如果节点88没有找到预期输出，查看其他节点
                for (const [nodeId, output] of Object.entries(history.outputs)) {
                    if (nodeId === '88') continue; // 跳过已检查的节点88
                    
                    const outputObj = output as any;
                    
                    // 检查gifs数组
                    if (outputObj.gifs && outputObj.gifs.length > 0) {
                        const outputPath = outputObj.gifs[0].fullpath;
                        this.logger.log(`在节点${nodeId}的gifs数组中找到输出路径:`, outputPath);
                        return {
                            status: 'completed',
                            completed: true,
                            outputPath
                        };
                    }
                    
                    // 检查videos数组
                    if (outputObj.videos && outputObj.videos.length > 0) {
                        const outputPath = outputObj.videos[0].fullpath;
                        this.logger.log(`在节点${nodeId}的videos数组中找到输出路径:`, outputPath);
                        return {
                            status: 'completed',
                            completed: true,
                            outputPath
                        };
                    }
                }

                // 如果没有找到任何视频输出
                this.logger.warn(`任务${promptId}已完成但未找到视频输出`);
                return {
                    status: 'failed',
                    completed: true,
                    error: '任务已完成但未找到视频输出'
                };
            }

            return {
                status: 'processing',
                completed: false
            };
        } catch (error) {
            this.logger.error(`查询ComfyUI状态失败:`, error);
            throw new Error(`查询ComfyUI状态失败: ${error.message}`);
        }
    }

    // 轮询任务状态
    private async pollTaskStatus(
        promptId: string,
        historyId: number,
        prompt: string,
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number
    ) {
        let retryCount = 0;
        const startTime = Date.now();
        const filesToCleanup: string[] = [];

        const poll = async () => {
            this.logger.log(`[LTXVideo任务${promptId}] 第${retryCount + 1}次查询状态，剩余${this.MAX_RETRIES - retryCount - 1}次`);

            if (retryCount >= this.MAX_RETRIES) {
                this.logger.log(`[LTXVideo任务${promptId}] 超过最大重试次数，任务超时`);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: this.MAX_RETRIES * this.POLL_INTERVAL,
                    historyErrorInfos: [{
                        errorMessage: '任务执行超时'
                    }]
                });
                await this.cleanupFiles(filesToCleanup);
                return;
            }

            try {
                const status = await this.queryComfyUIStatus(promptId);
                this.logger.log(`[LTXVideo任务${promptId}] 当前状态:`, status);

                if (status.completed) {
                    const useTime = Date.now() - startTime;

                    if (status.status === 'completed' && status.outputPath) {
                        this.logger.log(`[LTXVideo任务${promptId}] 成功完成，输出路径:`, status.outputPath);
                        
                        // 检查文件是否存在
                        if (!fs.existsSync(status.outputPath)) {
                            this.logger.error(`[LTXVideo任务${promptId}] 输出文件不存在:`, status.outputPath);
                            await this.taskRecordsService.updateTaskRecord({
                                historyId,
                                historyStatus: 'failed',
                                historyUseTime: useTime,
                                historyErrorInfos: [{
                                    errorMessage: `找不到输出文件: ${status.outputPath}`,
                                    errorDetails: { path: status.outputPath }
                                }]
                            });
                            return;
                        }
                        
                        filesToCleanup.push(status.outputPath);
                        
                        try {
                            // 上传视频到OSS
                            this.logger.log(`[LTXVideo任务${promptId}] 开始上传视频到OSS`);
                            const ossResults = await this.ossService.uploadFiles([{
                                fileName: `ltxvideo_${promptId}.mp4`,
                                filePath: status.outputPath
                            }]);

                            if (!ossResults || ossResults.length === 0) {
                                throw new Error('上传视频到OSS返回了空结果');
                            }

                            this.logger.log(`[LTXVideo任务${promptId}] 上传OSS成功`, ossResults);
                            
                            // 更新任务记录
                            await this.taskRecordsService.updateTaskRecord({
                                historyId,
                                historyStatus: 'completed',
                                historyUseTime: useTime,
                                historyResult: [{
                                    jobId: promptId,
                                    status: status.status,
                                    outputUrl: ossResults[0].fileURL, // 视频URL
                                    prompt: prompt,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                }]
                            });

                            // 扣除用户点数
                            const appList = await this.appListService.getPublicAppList();
                            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
                            const pointsToDeduct = appCostConfig?.generateVideo?.cost || this.POINTS_PER_TASK;
                            
                            this.logger.log(`[LTXVideo任务${promptId}] 开始扣除用户点数:`, {
                                userId: user.userId,
                                pointsToDeduct,
                                appId
                            });
                            const deductResult = await this.sqlService.deductPointsWithCheck(user, pointsToDeduct);
                            this.logger.log(`[LTXVideo任务${promptId}] 扣除点数结果:`, deductResult);
                            
                            this.logger.log(`[LTXVideo任务${promptId}] 任务处理完成`);
                        } catch (uploadError) {
                            this.logger.error(`[LTXVideo任务${promptId}] 上传或更新失败:`, uploadError);
                            await this.taskRecordsService.updateTaskRecord({
                                historyId,
                                historyStatus: 'failed',
                                historyUseTime: useTime,
                                historyErrorInfos: [{
                                    errorMessage: `上传视频失败: ${uploadError.message}`,
                                    errorDetails: uploadError
                                }]
                            });
                        }
                    } else {
                        // 更新失败状态
                        this.logger.error(`[LTXVideo任务${promptId}] 失败:`, status.error);
                        await this.taskRecordsService.updateTaskRecord({
                            historyId,
                            historyStatus: 'failed',
                            historyUseTime: useTime,
                            historyErrorInfos: [{
                                errorMessage: status.error || '任务失败',
                                errorDetails: status
                            }]
                        });
                    }

                    // 清理所有临时文件
                    await this.cleanupFiles(filesToCleanup);
                    return;
                }

                // 继续轮询
                retryCount++;
                setTimeout(poll, this.POLL_INTERVAL);
            } catch (error) {
                this.logger.error(`[LTXVideo任务${promptId}] 查询失败:`, error);
                await this.taskRecordsService.updateTaskRecord({
                    historyId,
                    historyStatus: 'failed',
                    historyUseTime: Date.now() - startTime,
                    historyErrorInfos: [{
                        errorMessage: error.message,
                        errorDetails: error
                    }]
                });
                await this.cleanupFiles(filesToCleanup);
            }
        };

        // 开始轮询
        this.logger.log(`[LTXVideo任务${promptId}] 开始轮询任务状态`);
        poll();
    }

    // 执行LTXVideo任务
    async executeLtxVideo(
        params: {
            prompt: string;
        },
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number
    ) {
        this.logger.log(`开始执行LTXVideo任务，用户ID: ${user.userId}, 提示词: ${params.prompt}`);
        try {
            // 检查用户点数是否足够
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            
            // 查找正确的点数配置项
            let pointsToDeduct = this.POINTS_PER_TASK;
            if (appCostConfig?.generateVideo?.cost) {
                pointsToDeduct = appCostConfig.generateVideo.cost;
                this.logger.log(`使用generateVideo配置的点数: ${pointsToDeduct}`);
            } else if (appCostConfig?.ltxvideo?.cost) {
                pointsToDeduct = appCostConfig.ltxvideo.cost;
                this.logger.log(`使用ltxvideo配置的点数: ${pointsToDeduct}`);
            } else {
                this.logger.log(`使用默认点数: ${pointsToDeduct}`);
            }
            
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(
                user.userId,
                pointsToDeduct
            );

            if (!isPointsEnough.isSuccess) {
                this.logger.warn(`用户${user.userId}余额不足, 需要${pointsToDeduct}点`);
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null
                };
            }

            // 验证输入参数
            if (!params.prompt || params.prompt.trim() === '') {
                return {
                    isSuccess: false,
                    message: '提示词不能为空',
                    data: null
                };
            }

            // 准备工作流配置
            const workflow = this.prepareWorkflowConfig(params.prompt);

            // 提交任务到ComfyUI
            this.logger.log(`提交LTXVideo任务到ComfyUI`);
            const promptId = await this.submitToComfyUI(workflow);
            this.logger.log(`任务提交成功，promptId: ${promptId}`);

            // 创建任务记录
            this.logger.log(`创建任务记录，用户ID: ${user.userId}, promptId: ${promptId}`);
            const taskRecord = await this.taskRecordsService.writeTaskRecord({
                historyUserId: user.userId,
                historyAppId: appId,
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: pointsToDeduct,
                historyResult: [{ 
                    jobId: promptId,
                    prompt: params.prompt
                }],
                historyErrorInfos: []
            });

            // 开始轮询任务状态
            this.logger.log(`开始轮询任务状态，historyId: ${taskRecord.historyId}`);
            this.pollTaskStatus(promptId, taskRecord.historyId, params.prompt, user, appId);

            return {
                isSuccess: true,
                message: '提交LTXVideo任务成功',
                data: taskRecord.historyId
            };
        } catch (error) {
            this.logger.error('执行LTXVideo任务失败:', error);
            return {
                isSuccess: false,
                message: `执行LTXVideo任务失败: ${error.message}`,
                data: null
            };
        }
    }

    // 从数据库查询任务状态
    async queryTaskStatus(taskId: string, userId: number): Promise<any> {
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
                data: null
            };
        }
    }
}
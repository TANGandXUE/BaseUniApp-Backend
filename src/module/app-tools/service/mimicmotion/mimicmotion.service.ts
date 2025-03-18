import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from '../../../apps/service/app-list/app-list.service';
import { OssService } from '../../../sql/service/oss/oss.service';
import FormData from 'form-data';
import * as workflowConfig from './workflow/mimicmotion-onlyresult.json';

// 任务执行结果类型
interface TaskResult {
    jobId: string;
    status: string;
    outputUrl?: string;
    createdAt: string;
    updatedAt: string;
}

// 错误信息类型
interface ErrorInfo {
    errorMessage: string;
    errorDetails?: any;
}

@Injectable()
export class MimicmotionService {
    private readonly COMFYUI_API = process.env.COMFYUI_SERVICE_URL || 'http://127.0.0.1:8188';
    private readonly POLL_INTERVAL = Number(process.env.MIMICMOTION_POLL_INTERVAL || 3000);
    private readonly MAX_RETRIES = Number(process.env.MIMICMOTION_MAX_RETRIES || 1000);
    private readonly TEMP_DIR = process.env.MIMICMOTION_TEMP_DIR || 'temp/mimicmotion';
    private readonly POINTS_PER_TASK = Number(process.env.MIMICMOTION_POINTS_PER_TASK || 200);

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

    // 生成唯一的临时文件名
    private generateTempFilename(originalUrl: string, prefix: string): string {
        const ext = path.extname(originalUrl);
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        return path.join(this.TEMP_DIR, `${prefix}_${timestamp}_${random}${ext}`);
    }

    // 清理临时文件
    private async cleanupFiles(files: string[]) {
        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                }
            } catch (error) {
                console.error(`Failed to delete file ${file}:`, error);
            }
        }
    }

    // 下载文件到临时目录
    private async downloadFile(url: string, prefix: string): Promise<string> {
        const tempFilePath = this.generateTempFilename(url, prefix);
        const writer = fs.createWriteStream(tempFilePath);

        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 30000 // 30秒超时
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(tempFilePath));
                writer.on('error', reject);
            });
        } catch (error) {
            writer.close();
            await this.cleanupFiles([tempFilePath]);
            throw new Error(`Failed to download file from ${url}: ${error.message}`);
        }
    }

    // 下载所需的文件
    private async downloadFiles(imageUrl: string, videoUrl: string): Promise<{ imagePath: string; videoPath: string }> {
        try {
            const [imagePath, videoPath] = await Promise.all([
                this.downloadFile(imageUrl, 'image'),
                this.downloadFile(videoUrl, 'video')
            ]);

            return { imagePath, videoPath };
        } catch (error) {
            throw new Error(`Failed to download files: ${error.message}`);
        }
    }

    // 上传文件到ComfyUI
    private async uploadToComfyUI(filePath: string, type: 'image' | 'video'): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('image', fs.createReadStream(filePath));
            
            const uploadUrl = `${this.COMFYUI_API}/upload/image`;
            const response = await axios.post(uploadUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                }
            });

            return response.data.name;
        } catch (error) {
            throw new Error(`Failed to upload ${type} to ComfyUI: ${error.message}`);
        }
    }

    // 准备工作流配置
    private async prepareWorkflowConfig(imagePath: string, videoPath: string) {
        try {
            // 上传文件到ComfyUI
            const [imageFileName, videoFileName] = await Promise.all([
                this.uploadToComfyUI(imagePath, 'image'),
                this.uploadToComfyUI(videoPath, 'video')
            ]);

            // 处理工作流配置
            const workflow = ('default' in workflowConfig) ? workflowConfig.default : workflowConfig;

            // 更新工作流中的图片和视频节点
            workflow['3'].inputs.image = imageFileName;
            workflow['5'].inputs.video = videoFileName;

            return workflow;
        } catch (error) {
            throw new Error(`Failed to prepare workflow config: ${error.message}`);
        }
    }

    // 提交任务到ComfyUI
    private async submitToComfyUI(workflow: any): Promise<string> {
        try {
            const requestBody = {
                prompt: workflow,
                client_id: `mimicmotion_${Date.now()}`,
                extra_data: {
                    required_outputs: [{
                        node_id: 16,
                        output_name: "video"
                    }]
                }
            };

            const response = await axios.post(`${this.COMFYUI_API}/prompt`, requestBody);
            return response.data.prompt_id;
        } catch (error) {
            if (error.response?.data) {
                throw new Error(`Failed to submit to ComfyUI: ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Failed to submit to ComfyUI: ${error.message}`);
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
                    error: 'Task not found'
                };
            }

            if (history.status?.status_str === 'error') {
                return {
                    status: 'failed',
                    completed: true,
                    error: JSON.stringify(history.status?.message || 'Unknown error')
                };
            }

            if (history.status?.completed && history.outputs?.['16']?.gifs?.[0]) {
                return {
                    status: 'success',
                    completed: true,
                    outputPath: history.outputs['16'].gifs[0].fullpath
                };
            }

            return {
                status: 'processing',
                completed: false
            };
        } catch (error) {
            throw new Error(`Failed to query ComfyUI status: ${error.message}`);
        }
    }

    // 轮询任务状态
    private async pollTaskStatus(
        promptId: string,
        historyId: number,
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number,
        filesToCleanup: string[]
    ) {
        let retryCount = 0;
        const startTime = Date.now();

        const poll = async () => {
            console.log(`[MimicMotion任务${promptId}] 第${retryCount + 1}次查询状态，剩余${this.MAX_RETRIES - retryCount - 1}次`);

            if (retryCount >= this.MAX_RETRIES) {
                console.log(`[MimicMotion任务${promptId}] 超过最大重试次数，任务超时`);
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
                console.log(`[MimicMotion任务${promptId}] 当前状态:`, status);

                if (status.completed) {
                    const useTime = Date.now() - startTime;

                    if (status.status === 'success' && status.outputPath) {
                        // 上传视频到OSS
                        const ossResults = await this.ossService.uploadFiles([{
                            fileName: `mimicmotion_${promptId}.mp4`,
                            filePath: status.outputPath
                        }]);

                        if (ossResults.length === 0) {
                            throw new Error('Failed to upload video to OSS');
                        }

                        // 更新任务记录
                        await this.taskRecordsService.updateTaskRecord({
                            historyId,
                            historyStatus: 'success',
                            historyUseTime: useTime,
                            historyResult: [{
                                jobId: promptId,
                                status: status.status,
                                videoUrl: ossResults[0].fileURL, // 视频URL
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }]
                        });

                        // 扣除用户点数
                        await this.sqlService.deductPointsWithCheck(user, this.POINTS_PER_TASK);
                    } else {
                        // 更新失败状态
                        await this.taskRecordsService.updateTaskRecord({
                            historyId,
                            historyStatus: 'failed',
                            historyUseTime: useTime,
                            historyErrorInfos: [{
                                errorMessage: status.error || 'Task failed',
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
                console.error(`[MimicMotion任务${promptId}] 查询失败:`, error);
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
        console.log(`[MimicMotion任务${promptId}] 开始轮询任务状态`);
        poll();
    }

    // 执行MimicMotion任务
    async executeMimicMotion(
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
    ) {
        try {
            // 检查用户点数是否足够
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(
                user.userId,
                appCostConfig?.mimicmotion?.cost || this.POINTS_PER_TASK
            );

            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null
                };
            }

            // 下载文件
            const { imagePath, videoPath } = await this.downloadFiles(
                params.source_url,
                params.target_url
            );

            // 准备工作流配置
            const workflow = await this.prepareWorkflowConfig(imagePath, videoPath);

            // 提交任务到ComfyUI
            const promptId = await this.submitToComfyUI(workflow);

            // 创建任务记录
            const taskRecord = await this.taskRecordsService.writeTaskRecord({
                historyUserId: user.userId,
                historyAppId: appId,
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: appCostConfig.mimicmotion.cost,
                historyResult: [{ jobId: promptId }],
                historyErrorInfos: []
            });

            // 开始轮询任务状态
            this.pollTaskStatus(promptId, taskRecord.historyId, user, appId, [imagePath, videoPath]);

            return {
                isSuccess: true,
                message: '提交MimicMotion任务成功',
                data: taskRecord.historyId
            };
        } catch (error) {
            console.error('执行MimicMotion任务失败:', error);
            return {
                isSuccess: false,
                message: `执行MimicMotion任务失败: ${error.message}`,
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
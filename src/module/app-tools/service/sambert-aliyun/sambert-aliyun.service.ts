import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import axios from 'axios';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from '../../../apps/service/app-list/app-list.service';
import { OssService } from '../../../sql/service/oss/oss.service';
import { VoiceCloneService } from '../../../sql/service/voice-clone/voice-clone.service';
import { defaultVoices } from './sambert-voice-list.data';

// WebSocket消息类型定义
interface WebSocketMessage {
    header: {
        task_id: string;
        event?: string;
        action?: string;
        streaming?: string;
        error_code?: string;
        error_message?: string;
        attributes?: Record<string, any>;
    };
    payload?: any;
}

// 任务执行结果类型
interface TaskResult {
    taskId: string;
    status: string;
    outputUrl?: string;
    text?: string;
    createdAt: string;
    updatedAt: string;
    characterCount?: number;
}

// 错误信息类型
interface ErrorInfo {
    errorMessage: string;
    errorDetails?: any;
}

// TTS参数类型
interface TTSParams {
    text_type?: string;
    voice?: string;
    format?: string;
    sample_rate?: number;
    volume?: number;
    rate?: number;
    pitch?: number;
    word_timestamp_enabled?: boolean;
    phoneme_timestamp_enabled?: boolean;
}

// 批量TTS请求项
interface BatchTTSItem {
    text: string;
    voice?: string;
    format?: string;
    sample_rate?: number;
    volume?: number;
    rate?: number;
    pitch?: number;
    word_timestamp_enabled?: boolean;
    phoneme_timestamp_enabled?: boolean;
}

// 自定义错误接口，包含任务信息
interface TaskError extends Error {
    taskInfo?: {
        taskId: string;
        text: string;
    };
}

// 定义自定义队列接口
interface TaskQueue {
    add(task: () => Promise<any>): void;
    onCompleted(callback: (result: any) => void): void;
    onError(callback: (error: TaskError) => void): void;
    waitForIdle(): Promise<void>;
}

// 自定义队列实现
class SimpleTaskQueue implements TaskQueue {
    private queue: Array<() => Promise<any>> = [];
    private running = 0;
    private completedCallbacks: Array<(result: any) => void> = [];
    private errorCallbacks: Array<(error: TaskError) => void> = [];
    private idleResolvers: Array<() => void> = [];
    private isProcessing = false;

    constructor(private readonly concurrency: number) {}

    /**
     * 添加任务到队列
     */
    add(task: () => Promise<any>): void {
        this.queue.push(task);
        this.processQueue();
    }

    /**
     * 注册任务完成的回调
     */
    onCompleted(callback: (result: any) => void): void {
        this.completedCallbacks.push(callback);
    }

    /**
     * 注册任务错误的回调
     */
    onError(callback: (error: TaskError) => void): void {
        this.errorCallbacks.push(callback);
    }

    /**
     * 等待队列处理完所有任务
     */
    waitForIdle(): Promise<void> {
        if (this.queue.length === 0 && this.running === 0) {
            return Promise.resolve();
        }
        
        return new Promise<void>(resolve => {
            this.idleResolvers.push(resolve);
        });
    }

    /**
     * 处理队列中的任务
     */
    private processQueue(): void {
        if (this.isProcessing) return;

        this.isProcessing = true;

        setTimeout(() => {
            this.isProcessing = false;

            while (this.queue.length > 0 && this.running < this.concurrency) {
                const task = this.queue.shift();
                this.running++;

                task()
                    .then(result => {
                        this.running--;
                        this.completedCallbacks.forEach(callback => callback(result));
                        this.checkIdle();
                        this.processQueue();
                    })
                    .catch(error => {
                        this.running--;
                        this.errorCallbacks.forEach(callback => callback(error));
                        this.checkIdle();
                        this.processQueue();
                    });
            }
        }, 0);
    }

    /**
     * 检查队列是否空闲
     */
    private checkIdle(): void {
        if (this.queue.length === 0 && this.running === 0 && this.idleResolvers.length > 0) {
            const resolvers = [...this.idleResolvers];
            this.idleResolvers = [];
            resolvers.forEach(resolve => resolve());
        }
    }
}

@Injectable()
export class SambertAliyunService {
    private readonly logger = new Logger(SambertAliyunService.name);
    private readonly API_KEY = process.env.DASHSCOPE_API_KEY || '';
    private readonly WS_URL = process.env.SAMBERT_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
    private readonly POINTS_PER_CHARACTER = Number(process.env.SAMBERT_POINTS_PER_CHARACTER || 0.1);
    private readonly TEMP_DIR = process.env.SAMBERT_TEMP_DIR || 'temp/sambert';
    private readonly DEFAULT_VOICE = process.env.SAMBERT_DEFAULT_VOICE || 'sambert-zhichu-v1';
    private readonly MAX_CONCURRENCY = Number(process.env.SAMBERT_MAX_CONCURRENCY || 3);
    private readonly MAX_RETRIES = Number(process.env.SAMBERT_MAX_RETRIES || 3);
    private readonly RETRY_DELAY = Number(process.env.SAMBERT_RETRY_DELAY || 5000);

    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService,
        private readonly ossService: OssService,
        private readonly voiceCloneService: VoiceCloneService
    ) {
        // 确保临时目录存在
        if (!fs.existsSync(this.TEMP_DIR)) {
            fs.mkdirSync(this.TEMP_DIR, { recursive: true });
        }
        
        this.logger.log(`SambertAliyunService 初始化完成，配置：
            WS_URL: ${this.WS_URL}
            API_KEY: ${this.API_KEY ? '已配置' : '未配置'}
            POINTS_PER_CHARACTER: ${this.POINTS_PER_CHARACTER}
            TEMP_DIR: ${this.TEMP_DIR}
            DEFAULT_VOICE: ${this.DEFAULT_VOICE}
            MAX_CONCURRENCY: ${this.MAX_CONCURRENCY}
            MAX_RETRIES: ${this.MAX_RETRIES}
            RETRY_DELAY: ${this.RETRY_DELAY}ms
        `);
    }

    // 清理临时文件
    private async cleanupFiles(files: string[]) {
        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                    this.logger.log(`成功删除临时文件: ${file}`);
                }
            } catch (error) {
                this.logger.error(`删除文件 ${file} 失败:`, error);
            }
        }
    }

    // 执行语音合成任务
    async executeTTS(
        params: {
            text: string;
            voice?: string;
            format?: string;
            sample_rate?: number;
            volume?: number;
            rate?: number;
            pitch?: number;
            word_timestamp_enabled?: boolean;
            phoneme_timestamp_enabled?: boolean;
        },
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number
    ): Promise<any> {
        this.logger.log(`开始执行语音合成任务，用户ID: ${user.userId}, 文本: ${params.text}`);
        this.logger.log(`详细参数: ${JSON.stringify(params, null, 2)}`);
        
        try {
            // 验证输入参数
            if (!params.text || params.text.trim() === '') {
                return {
                    isSuccess: false,
                    message: '合成文本不能为空',
                    data: null
                };
            }

            // 计算预估点数
            const charCount = params.text.length;
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const pointsPerChar = appCostConfig?.tts?.cost || this.POINTS_PER_CHARACTER;
            const pointsToDeduct = Math.ceil(charCount * pointsPerChar);

            this.logger.log(`预估点数: ${charCount} 字符 * ${pointsPerChar} 点/字符 = ${pointsToDeduct} 点`);

            // 检查用户点数是否足够
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

            // 创建任务记录
            const taskId = uuid.v4();
            const outputFilePath = path.join(this.TEMP_DIR, `${taskId}.${params.format || 'mp3'}`);

            this.logger.log(`创建任务记录，用户ID: ${user.userId}, taskId: ${taskId}`);
            const taskRecord = await this.taskRecordsService.writeTaskRecord({
                historyUserId: user.userId,
                historyAppId: appId,
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: pointsToDeduct,
                historyResult: [{
                    taskId: taskId,
                    text: params.text
                }],
                historyErrorInfos: []
            });
            
            this.logger.log(`任务记录创建成功: ${JSON.stringify(taskRecord, null, 2)}`);

            // 准备TTS参数
            const ttsParams: TTSParams = {
                text_type: 'PlainText',
                voice: params.voice || this.DEFAULT_VOICE,
                format: params.format || 'mp3',
                sample_rate: params.sample_rate || 16000,
                volume: params.volume !== undefined ? params.volume : 50,
                rate: params.rate !== undefined ? params.rate : 1,
                pitch: params.pitch !== undefined ? params.pitch : 1,
                word_timestamp_enabled: params.word_timestamp_enabled !== undefined ? params.word_timestamp_enabled : false,
                phoneme_timestamp_enabled: params.phoneme_timestamp_enabled !== undefined ? params.phoneme_timestamp_enabled : false
            };
            
            this.logger.log(`TTS参数准备完成: ${JSON.stringify(ttsParams, null, 2)}`);

            // 启动WebSocket连接处理
            this.startWebSocketTask(
                taskId,
                params.text,
                ttsParams,
                outputFilePath,
                taskRecord.historyId,
                user,
                appId,
                charCount
            );

            return {
                isSuccess: true,
                message: '提交语音合成任务成功',
                data: taskRecord.historyId
            };
        } catch (error) {
            this.logger.error('执行语音合成任务失败:', error);
            return {
                isSuccess: false,
                message: `执行语音合成任务失败: ${error.message}`,
                data: null
            };
        }
    }

    // 启动WebSocket任务
    private async startWebSocketTask(
        taskId: string,
        text: string,
        ttsParams: TTSParams,
        outputFilePath: string,
        historyId: number,
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number,
        charCount: number
    ) {
        this.logger.log(`[Sambert任务${taskId}] 开始处理WebSocket任务`);

        const startTime = Date.now();
        const filesToCleanup = [outputFilePath];
        let ws: WebSocket = null;
        let outputFileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
        let taskStarted = false;
        let taskFailed = false;
        let audioDataReceived = false;

        try {
            // 创建WebSocket连接
            this.logger.log(`[Sambert任务${taskId}] 准备建立WebSocket连接，URL: ${this.WS_URL}`);
            this.logger.log(`[Sambert任务${taskId}] 请求头: 
                Authorization: bearer ${this.API_KEY.substring(0, 5)}...
                X-DashScope-DataInspection: enable
            `);
            
            ws = new WebSocket(this.WS_URL, {
                headers: {
                    'Authorization': `bearer ${this.API_KEY}`,
                    'X-DashScope-DataInspection': 'enable'
                }
            });

            // 处理WebSocket连接成功
            ws.on('open', () => {
                this.logger.log(`[Sambert任务${taskId}] WebSocket连接建立成功，准备发送run-task指令`);

                // 发送run-task指令
                const runTaskMessage: WebSocketMessage = {
                    header: {
                        action: 'run-task',
                        task_id: taskId,
                        streaming: 'out'
                    },
                    payload: {
                        model: ttsParams.voice,
                        task_group: 'audio',
                        task: 'tts',
                        function: 'SpeechSynthesizer',
                        input: {
                            text: text
                        },
                        parameters: {
                            text_type: ttsParams.text_type,
                            format: ttsParams.format,
                            sample_rate: ttsParams.sample_rate,
                            volume: ttsParams.volume,
                            rate: ttsParams.rate,
                            pitch: ttsParams.pitch,
                            word_timestamp_enabled: ttsParams.word_timestamp_enabled,
                            phoneme_timestamp_enabled: ttsParams.phoneme_timestamp_enabled
                        }
                    }
                };
                
                const messageStr = JSON.stringify(runTaskMessage);
                this.logger.log(`[Sambert任务${taskId}] 发送run-task指令: ${messageStr}`);
                ws.send(messageStr);
                
                this.logger.log(`[Sambert任务${taskId}] run-task指令已发送`);
            });

            // 处理WebSocket消息
            ws.on('message', async (data) => {
                try {
                    this.logger.log(`[Sambert任务${taskId}] 收到消息类型: ${typeof data}`);
                    
                    // 尝试解析为JSON文本消息
                    let isTextMessage = false;
                    let message: WebSocketMessage = null;
                    let dataBuffer: Buffer = null;
                    
                    // 将RawData转换为Buffer以便处理
                    if (Buffer.isBuffer(data)) {
                        dataBuffer = data;
                    } else if (data instanceof ArrayBuffer) {
                        dataBuffer = Buffer.from(data);
                    } else if (typeof data === 'string') {
                        // 直接是字符串
                        isTextMessage = true;
                        try {
                            message = JSON.parse(data);
                            this.logger.log(`[Sambert任务${taskId}] 直接识别为JSON文本消息`);
                        } catch (e) {
                            this.logger.error(`[Sambert任务${taskId}] 字符串解析JSON失败: ${e.message}`);
                        }
                    } else {
                        // 处理其他可能的类型
                        try {
                            const strData = data.toString();
                            if (strData && strData.trim().startsWith('{')) {
                                message = JSON.parse(strData);
                                isTextMessage = true;
                                this.logger.log(`[Sambert任务${taskId}] 其他类型转换为JSON成功`);
                            }
                        } catch (e) {
                            this.logger.error(`[Sambert任务${taskId}] 未知类型转换失败: ${e.message}`);
                            // 尝试转换为Buffer
                            try {
                                dataBuffer = Buffer.from(data as any);
                            } catch (bufferErr) {
                                this.logger.error(`[Sambert任务${taskId}] 无法转换为Buffer: ${bufferErr.message}`);
                            }
                        }
                    }
                    
                    // 如果有Buffer但还未确定是否为文本消息，尝试解析
                    if (dataBuffer && !isTextMessage) {
                        try {
                            const dataStr = dataBuffer.toString('utf8');
                            // 检查是否以 { 开头，这是JSON的特征
                            if (dataStr.trim().startsWith('{')) {
                                message = JSON.parse(dataStr);
                                isTextMessage = true;
                                this.logger.log(`[Sambert任务${taskId}] Buffer解析为JSON成功: ${dataStr}`);
                            }
                        } catch (parseError) {
                            // 解析失败，说明不是JSON文本
                            isTextMessage = false;
                            this.logger.log(`[Sambert任务${taskId}] Buffer不是JSON文本，确认为二进制数据`);
                        }
                    }
                    
                    if (isTextMessage && message) {
                        // 处理JSON文本消息
                        this.logger.log(`[Sambert任务${taskId}] 解析后的消息: ${JSON.stringify(message, null, 2)}`);
                        this.logger.log(`[Sambert任务${taskId}] 收到事件: ${message.header.event}`);

                        switch (message.header.event) {
                            case 'task-started':
                                taskStarted = true;
                                this.logger.log(`[Sambert任务${taskId}] 任务已开始`);
                                break;

                            case 'result-generated':
                                this.logger.log(`[Sambert任务${taskId}] 收到中间结果`);
                                // 如果有时间戳信息，可以在这里处理
                                if (message.payload?.output?.sentence) {
                                    this.logger.log(`[Sambert任务${taskId}] 时间戳信息: ${JSON.stringify(message.payload.output.sentence, null, 2)}`);
                                }
                                break;

                            case 'task-finished':
                                const useTime = Date.now() - startTime;
                                this.logger.log(`[Sambert任务${taskId}] 任务完成，耗时: ${useTime}ms`);
                                this.logger.log(`[Sambert任务${taskId}] 任务完成详细信息: ${JSON.stringify(message.payload, null, 2)}`);
                                this.logger.log(`[Sambert任务${taskId}] 使用字符数: ${message.payload?.usage?.characters || charCount}`);

                                // 关闭文件流
                                outputFileStream.end(() => {
                                    this.logger.log(`[Sambert任务${taskId}] 音频文件写入完成，检查文件大小: ${fs.statSync(outputFilePath).size} 字节`);
                                    this.logger.log(`[Sambert任务${taskId}] 准备上传到OSS`);

                                    // 上传到OSS
                                    this.ossService.uploadFiles([{
                                        fileName: `sambert_${taskId}.${ttsParams.format}`,
                                        filePath: outputFilePath
                                    }]).then(ossResults => {
                                        if (!ossResults || ossResults.length === 0) {
                                            throw new Error('上传音频到OSS返回了空结果');
                                        }

                                        this.logger.log(`[Sambert任务${taskId}] 上传OSS成功: ${JSON.stringify(ossResults, null, 2)}`);

                                        // 更新任务记录
                                        const updateData = {
                                            historyId,
                                            historyStatus: 'completed',
                                            historyUseTime: useTime,
                                            historyResult: [{
                                                taskId,
                                                status: 'completed',
                                                outputUrl: ossResults[0].fileURL,
                                                text: text,
                                                characterCount: message.payload?.usage?.characters || charCount,
                                                createdAt: new Date().toISOString(),
                                                updatedAt: new Date().toISOString()
                                            }]
                                        };
                                        
                                        this.logger.log(`[Sambert任务${taskId}] 更新任务记录: ${JSON.stringify(updateData, null, 2)}`);
                                        
                                        this.taskRecordsService.updateTaskRecord(updateData).then(() => {
                                            this.logger.log(`[Sambert任务${taskId}] 任务记录更新成功`);

                                            // 扣除用户点数
                                            const pointsToDeduct = (message.payload?.usage?.characters || charCount) * this.POINTS_PER_CHARACTER;
                                            this.logger.log(`[Sambert任务${taskId}] 准备扣除用户点数: ${pointsToDeduct}`);
                                            
                                            this.sqlService.deductPointsWithCheck(user, pointsToDeduct)
                                                .then((deductResult) => {
                                                    this.logger.log(`[Sambert任务${taskId}] 用户点数扣除成功: ${JSON.stringify(deductResult, null, 2)}`);
                                                })
                                                .catch(err => {
                                                    this.logger.error(`[Sambert任务${taskId}] 扣除点数失败:`, err);
                                                });
                                        }).catch(updateError => {
                                            this.logger.error(`[Sambert任务${taskId}] 更新任务记录失败:`, updateError);
                                        });

                                        // 清理临时文件
                                        this.cleanupFiles(filesToCleanup);
                                    }).catch(error => {
                                        this.logger.error(`[Sambert任务${taskId}] 上传到OSS失败:`, error);
                                        
                                        const failedData = {
                                            historyId,
                                            historyStatus: 'failed',
                                            historyUseTime: useTime,
                                            historyErrorInfos: [{
                                                errorMessage: `上传音频文件失败: ${error.message}`,
                                                errorDetails: error
                                            }]
                                        };
                                        
                                        this.logger.log(`[Sambert任务${taskId}] 更新为失败状态: ${JSON.stringify(failedData, null, 2)}`);
                                        
                                        this.taskRecordsService.updateTaskRecord(failedData);
                                        this.cleanupFiles(filesToCleanup);
                                    });
                                });
                                break;

                            case 'task-failed':
                                taskFailed = true;
                                this.logger.error(`[Sambert任务${taskId}] 任务失败:`);
                                this.logger.error(`[Sambert任务${taskId}] 错误代码: ${message.header.error_code}`);
                                this.logger.error(`[Sambert任务${taskId}] 错误消息: ${message.header.error_message}`);
                                this.logger.error(`[Sambert任务${taskId}] 完整错误详情: ${JSON.stringify(message, null, 2)}`);

                                // 更新任务记录
                                const failData = {
                                    historyId,
                                    historyStatus: 'failed',
                                    historyUseTime: Date.now() - startTime,
                                    historyErrorInfos: [{
                                        errorMessage: message.header.error_message || '任务执行失败',
                                        errorDetails: message.header
                                    }]
                                };
                                
                                this.logger.log(`[Sambert任务${taskId}] 更新为失败状态: ${JSON.stringify(failData, null, 2)}`);
                                
                                await this.taskRecordsService.updateTaskRecord(failData);

                                // 清理临时文件
                                await this.cleanupFiles(filesToCleanup);

                                // 关闭WebSocket连接
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.close();
                                    this.logger.log(`[Sambert任务${taskId}] WebSocket连接已主动关闭`);
                                }
                                break;

                            default:
                                this.logger.log(`[Sambert任务${taskId}] 收到其他事件: ${message.header.event}`);
                                this.logger.log(`[Sambert任务${taskId}] 完整消息: ${JSON.stringify(message, null, 2)}`);
                                break;
                        }
                    } else if (dataBuffer) {
                        // 确认为二进制音频数据
                        this.logger.log(`[Sambert任务${taskId}] 处理二进制音频数据，大小: ${dataBuffer.length} 字节`);
                        if (!audioDataReceived) {
                            audioDataReceived = true;
                            this.logger.log(`[Sambert任务${taskId}] 收到第一块音频数据，大小: ${dataBuffer.length} 字节`);
                        }
                        outputFileStream.write(dataBuffer);
                    } else {
                        // 无法处理的数据类型
                        this.logger.warn(`[Sambert任务${taskId}] 收到无法处理的数据类型: ${typeof data}`);
                    }
                } catch (error) {
                    this.logger.error(`[Sambert任务${taskId}] 处理WebSocket消息出错:`, error);
                    this.logger.error(`[Sambert任务${taskId}] 错误堆栈: ${error.stack}`);
                    
                    // 尝试记录数据信息便于调试
                    try {
                        if (Buffer.isBuffer(data)) {
                            this.logger.error(`[Sambert任务${taskId}] 错误发生在处理Buffer数据，长度: ${data.length} 字节`);
                        } else if (data instanceof ArrayBuffer) {
                            this.logger.error(`[Sambert任务${taskId}] 错误发生在处理ArrayBuffer数据，长度: ${data.byteLength} 字节`);
                        } else if (typeof data === 'string') {
                            const dataStr = data as string; // 确保类型为字符串
                            this.logger.error(`[Sambert任务${taskId}] 错误发生在处理字符串数据，内容: ${dataStr.substring(0, 100)}${dataStr.length > 100 ? '...(已截断)' : ''}`);
                        } else {
                            this.logger.error(`[Sambert任务${taskId}] 错误发生在处理未知类型数据: ${typeof data}`);
                        }
                    } catch (logError) {
                        this.logger.error(`[Sambert任务${taskId}] 记录错误数据信息时出错:`, logError);
                    }

                    if (!taskFailed) {
                        const errorData = {
                            historyId,
                            historyStatus: 'failed',
                            historyUseTime: Date.now() - startTime,
                            historyErrorInfos: [{
                                errorMessage: `处理WebSocket消息出错: ${error.message}`,
                                errorDetails: error
                            }]
                        };
                        
                        this.logger.log(`[Sambert任务${taskId}] 更新为失败状态: ${JSON.stringify(errorData, null, 2)}`);
                        
                        await this.taskRecordsService.updateTaskRecord(errorData);
                        
                        taskFailed = true;
                    }

                    // 清理临时文件
                    await this.cleanupFiles(filesToCleanup);

                    // 关闭WebSocket连接
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                        this.logger.log(`[Sambert任务${taskId}] WebSocket连接已主动关闭 (出错后关闭)`);
                    }
                }
            });

            // 处理WebSocket错误
            ws.on('error', async (error) => {
                this.logger.error(`[Sambert任务${taskId}] WebSocket错误:`, error);
                this.logger.error(`[Sambert任务${taskId}] 错误堆栈: ${error.stack}`);

                if (!taskFailed) {
                    const errorData = {
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: Date.now() - startTime,
                        historyErrorInfos: [{
                            errorMessage: `WebSocket连接错误: ${error.message}`,
                            errorDetails: error
                        }]
                    };
                    
                    this.logger.log(`[Sambert任务${taskId}] 更新为失败状态 (WebSocket错误): ${JSON.stringify(errorData, null, 2)}`);
                    
                    await this.taskRecordsService.updateTaskRecord(errorData);
                    
                    taskFailed = true;
                }

                // 清理临时文件
                await this.cleanupFiles(filesToCleanup);

                // 关闭文件流
                if (outputFileStream) {
                    outputFileStream.end(() => {
                        this.logger.log(`[Sambert任务${taskId}] 音频文件流已关闭 (WebSocket错误)`);
                    });
                }
            });

            // 处理WebSocket关闭
            ws.on('close', (code, reason) => {
                this.logger.log(`[Sambert任务${taskId}] WebSocket连接关闭: 代码=${code}, 原因=${reason || '未提供'}`);

                // 如果任务既没有失败也没有完成，标记为失败
                if (!taskFailed && !taskStarted) {
                    const closeData = {
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: Date.now() - startTime,
                        historyErrorInfos: [{
                            errorMessage: `WebSocket连接关闭: ${code} ${reason || '未知原因'}`,
                            errorDetails: { code, reason }
                        }]
                    };
                    
                    this.logger.log(`[Sambert任务${taskId}] 更新为失败状态 (WebSocket关闭): ${JSON.stringify(closeData, null, 2)}`);
                    
                    this.taskRecordsService.updateTaskRecord(closeData);
                }

                // 关闭文件流
                if (outputFileStream) {
                    outputFileStream.end(() => {
                        this.logger.log(`[Sambert任务${taskId}] 音频文件流已关闭 (WebSocket关闭)`);
                        
                        // 检查文件是否存在再进行操作
                        if (fs.existsSync(outputFilePath)) {
                            try {
                                const stats = fs.statSync(outputFilePath);
                                this.logger.log(`[Sambert任务${taskId}] 音频文件大小: ${stats.size} 字节`);
                                if (stats.size === 0) {
                                    this.logger.warn(`[Sambert任务${taskId}] 警告: 生成的音频文件为空`);
                                }
                            } catch (err) {
                                this.logger.error(`[Sambert任务${taskId}] 检查音频文件失败:`, err);
                            }
                        } else {
                            this.logger.log(`[Sambert任务${taskId}] 音频文件已被删除，跳过检查`);
                        }
                    });
                }
            });

            // 设置超时处理
            setTimeout(async () => {
                if (!taskFailed && ws.readyState === WebSocket.OPEN) {
                    this.logger.warn(`[Sambert任务${taskId}] 任务执行超时 (2分钟)`);

                    // 更新任务记录
                    const timeoutData = {
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: Date.now() - startTime,
                        historyErrorInfos: [{
                            errorMessage: '任务执行超时 (2分钟)'
                        }]
                    };
                    
                    this.logger.log(`[Sambert任务${taskId}] 更新为失败状态 (超时): ${JSON.stringify(timeoutData, null, 2)}`);
                    
                    await this.taskRecordsService.updateTaskRecord(timeoutData);

                    // 清理临时文件
                    await this.cleanupFiles(filesToCleanup);

                    // 关闭WebSocket连接
                    ws.close();
                    this.logger.log(`[Sambert任务${taskId}] WebSocket连接已主动关闭 (超时)`);
                }
            }, 120000); // 2分钟超时
        } catch (error) {
            this.logger.error(`[Sambert任务${taskId}] 启动WebSocket任务失败:`, error);
            this.logger.error(`[Sambert任务${taskId}] 错误堆栈: ${error.stack}`);

            // 更新任务记录
            const startErrorData = {
                historyId,
                historyStatus: 'failed',
                historyUseTime: Date.now() - startTime,
                historyErrorInfos: [{
                    errorMessage: `启动WebSocket任务失败: ${error.message}`,
                    errorDetails: error
                }]
            };
            
            this.logger.log(`[Sambert任务${taskId}] 更新为失败状态 (启动失败): ${JSON.stringify(startErrorData, null, 2)}`);
            
            await this.taskRecordsService.updateTaskRecord(startErrorData);

            // 清理临时文件
            await this.cleanupFiles(filesToCleanup);

            // 关闭WebSocket连接
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
                this.logger.log(`[Sambert任务${taskId}] WebSocket连接已主动关闭 (启动失败)`);
            }

            // 关闭文件流
            if (outputFileStream) {
                outputFileStream.end(() => {
                    this.logger.log(`[Sambert任务${taskId}] 音频文件流已关闭 (启动失败)`);
                });
            }
        }
    }

    // 从数据库查询任务状态
    async queryTaskStatus(taskId: number, userId: number): Promise<any> {
        this.logger.log(`查询任务状态，taskId: ${taskId}, userId: ${userId}`);
        
        try {
            const taskRecord = await this.taskRecordsService.getTaskRecordById(taskId);
            this.logger.log(`查询到任务记录: ${JSON.stringify(taskRecord, null, 2)}`);
            
            return {
                isSuccess: true,
                message: '查询任务状态成功',
                data: taskRecord
            };
        } catch (error) {
            this.logger.error(`查询任务状态失败:`, error);
            
            return {
                isSuccess: false,
                message: `查询任务状态失败: ${error.message}`,
                data: null
            };
        }
    }

    // 获取支持的语音列表
    async getVoiceList(): Promise<any> {
        this.logger.log(`获取语音列表`);
        
        // 获取默认音色列表
        const systemVoices = defaultVoices;
        
        this.logger.log(`返回${systemVoices.length}个音色列表`);

        return {
            isSuccess: true,
            message: '获取语音列表成功',
            data: systemVoices
        };
    }

    // 执行批量语音合成任务
    async executeBatchTTS(
        params: {
            items: BatchTTSItem[]
        },
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number
    ): Promise<any> {
        this.logger.log(`开始执行批量语音合成任务，用户ID: ${user.userId}, 批次数量: ${params.items.length}`);
        
        try {
            // 验证输入参数
            if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
                return {
                    isSuccess: false,
                    message: '批量任务列表不能为空',
                    data: null
                };
            }

            // 检查每个文本是否有效
            for (let i = 0; i < params.items.length; i++) {
                if (!params.items[i].text || params.items[i].text.trim() === '') {
                    return {
                        isSuccess: false,
                        message: `第${i+1}项的合成文本不能为空`,
                        data: null
                    };
                }
            }

            // 计算预估总点数
            let totalCharCount = 0;
            params.items.forEach(item => {
                totalCharCount += item.text.length;
            });

            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const pointsPerChar = appCostConfig?.tts?.cost || this.POINTS_PER_CHARACTER;
            const pointsToDeduct = Math.ceil(totalCharCount * pointsPerChar);

            this.logger.log(`预估总点数: ${totalCharCount} 字符 * ${pointsPerChar} 点/字符 = ${pointsToDeduct} 点`);

            // 检查用户点数是否足够
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

            // 创建批量任务记录
            const historyId = uuid.v4();
            const initialResults = params.items.map(item => ({
                taskId: uuid.v4(),
                text: item.text,
                status: 'processing'
            }));

            this.logger.log(`创建批量任务记录，用户ID: ${user.userId}, historyId: ${historyId}, 任务数量: ${initialResults.length}`);
            const taskRecord = await this.taskRecordsService.writeTaskRecord({
                historyUserId: user.userId,
                historyAppId: appId,
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: pointsToDeduct,
                historyResult: initialResults,
                historyErrorInfos: []
            });
            
            this.logger.log(`批量任务记录创建成功: ${JSON.stringify(taskRecord, null, 2)}`);

            // 启动批量处理
            this.processBatchTasks(
                params.items,
                initialResults.map(r => r.taskId),
                taskRecord.historyId,
                user,
                appId,
                totalCharCount
            );

            return {
                isSuccess: true,
                message: '提交批量语音合成任务成功',
                data: taskRecord.historyId
            };
        } catch (error) {
            this.logger.error('执行批量语音合成任务失败:', error);
            return {
                isSuccess: false,
                message: `执行批量语音合成任务失败: ${error.message}`,
                data: null
            };
        }
    }

    // 处理批量任务
    private async processBatchTasks(
        items: BatchTTSItem[],
        taskIds: string[],
        historyId: number,
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        appId: number,
        totalCharCount: number
    ) {
        this.logger.log(`开始处理批量任务，historyId: ${historyId}, 任务数量: ${items.length}`);
        
        const startTime = Date.now();
        const results = [];
        const failedTasks = [];
        
        try {
            // 创建自定义任务队列，设置并发数
            const queue = new SimpleTaskQueue(this.MAX_CONCURRENCY);

            this.logger.log(`创建任务队列，最大并发数: ${this.MAX_CONCURRENCY}`);
            
            // 注册任务完成事件
            queue.onCompleted((result) => {
                this.logger.log(`任务完成: ${result.taskId}`);
                results.push(result);
            });
            
            // 注册任务失败事件
            queue.onError((error: TaskError) => {
                const taskInfo = error.taskInfo || { 
                    taskId: 'unknown-' + uuid.v4().substring(0, 8),
                    text: '未知文本'
                };
                
                this.logger.error(`任务执行失败: ${error.message}, taskId: ${taskInfo.taskId}`);
                const failedTask = {
                    taskId: taskInfo.taskId,
                    status: 'failed',
                    text: taskInfo.text,
                    errorMessage: error.message,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                failedTasks.push(failedTask);
                results.push(failedTask);
            });
            
            // 为每个任务添加到队列
            for (let i = 0; i < items.length; i++) {
                // 添加到队列，并设置重试次数
                queue.add(async () => {
                    try {
                        return await this.processTaskWithRetry(items[i], taskIds[i], historyId, i, 0);
                    } catch (error) {
                        // 添加任务信息到错误对象
                        (error as TaskError).taskInfo = {
                            taskId: taskIds[i],
                            text: items[i].text
                        };
                        throw error;
                    }
                });
            }
            
            // 等待所有任务完成
            this.logger.log(`等待所有任务完成...`);
            await queue.waitForIdle();
            this.logger.log(`所有任务处理完毕，成功: ${results.length - failedTasks.length}，失败: ${failedTasks.length}`);
            
            // 更新任务记录
            const useTime = Date.now() - startTime;
            const allFailed = results.every(r => r.status === 'failed');
            
            const updateData = {
                historyId,
                historyStatus: allFailed ? 'failed' : 'completed',
                historyUseTime: useTime,
                historyResult: results
            };
            
            this.logger.log(`批量任务处理完成，更新任务记录: ${JSON.stringify(updateData, null, 2)}`);
            await this.taskRecordsService.updateTaskRecord(updateData);
            
            // 扣除用户点数
            if (!allFailed) {
                const pointsToDeduct = Math.ceil(totalCharCount * this.POINTS_PER_CHARACTER);
                this.logger.log(`批量任务完成，扣除用户点数: ${pointsToDeduct}`);
                
                await this.sqlService.deductPointsWithCheck(user, pointsToDeduct)
                    .then((deductResult) => {
                        this.logger.log(`批量任务扣点成功: ${JSON.stringify(deductResult, null, 2)}`);
                    })
                    .catch(err => {
                        this.logger.error(`批量任务扣点失败:`, err);
                    });
            }
            
            this.logger.log(`批量任务全部处理完成，historyId: ${historyId}, 耗时: ${useTime}ms`);
        } catch (error) {
            this.logger.error(`批量任务处理发生异常:`, error);
            
            // 更新任务状态为失败
            const failData = {
                historyId,
                historyStatus: 'failed',
                historyUseTime: Date.now() - startTime,
                historyErrorInfos: [{
                    errorMessage: `批量任务处理失败: ${error.message}`,
                    errorDetails: error
                }]
            };
            
            await this.taskRecordsService.updateTaskRecord(failData);
        }
    }
    
    // 处理单个任务并支持重试
    private async processTaskWithRetry(
        item: BatchTTSItem,
        taskId: string,
        historyId: number,
        index: number,
        retryCount: number
    ): Promise<TaskResult> {
        this.logger.log(`处理批量任务中的第${index+1}项，taskId: ${taskId}, 重试次数: ${retryCount}`);
        
        try {
            // 执行单个任务
            const result = await this.processSingleTask(item, taskId, historyId, index);
            return result;
        } catch (error) {
            // 检查是否是API限速错误
            const isRateLimitError = error.message && 
                (error.message.includes('rate limit') || 
                 error.message.includes('too many requests') ||
                 error.message.toLowerCase().includes('throttled'));
            
            // 判断是否需要重试
            if (retryCount < this.MAX_RETRIES && (isRateLimitError || error.code === 'ECONNRESET')) {
                // 计算延迟时间，指数退避策略
                const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
                this.logger.log(`遇到限速或连接重置错误，${delay}ms后重试，taskId: ${taskId}, 当前重试次数: ${retryCount+1}/${this.MAX_RETRIES}`);
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.processTaskWithRetry(item, taskId, historyId, index, retryCount + 1);
            } else {
                // 超过最大重试次数，标记为失败
                this.logger.error(`任务失败，已达到最大重试次数或不可重试的错误: ${error.message}`);
                throw error;
            }
        }
    }
    
    // 处理单个任务
    private async processSingleTask(
        item: BatchTTSItem,
        taskId: string,
        historyId: number,
        index: number
    ): Promise<TaskResult> {
        this.logger.log(`处理批量任务中的第${index+1}项，taskId: ${taskId}, 文本: ${item.text.substring(0, 30)}...`);
        
        // 准备TTS参数
        const ttsParams: TTSParams = {
            text_type: 'PlainText',
            voice: item.voice || this.DEFAULT_VOICE,
            format: item.format || 'mp3',
            sample_rate: item.sample_rate || 16000,
            volume: item.volume !== undefined ? item.volume : 50,
            rate: item.rate !== undefined ? item.rate : 1,
            pitch: item.pitch !== undefined ? item.pitch : 1,
            word_timestamp_enabled: item.word_timestamp_enabled || false,
            phoneme_timestamp_enabled: item.phoneme_timestamp_enabled || false
        };
        
        const outputFilePath = path.join(this.TEMP_DIR, `${taskId}.${ttsParams.format}`);
        const filesToCleanup = [outputFilePath];
        
        return new Promise(async (resolve, reject) => {
            let ws: WebSocket = null;
            let outputFileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
            let taskStarted = false;
            let taskFailed = false;
            let audioDataReceived = false;
            
            try {
                ws = new WebSocket(this.WS_URL, {
                    headers: {
                        'Authorization': `bearer ${this.API_KEY}`,
                        'X-DashScope-DataInspection': 'enable'
                    }
                });
                
                // 连接成功时发送任务
                ws.on('open', () => {
                    // 发送run-task指令
                    const runTaskMessage: WebSocketMessage = {
                        header: {
                            action: 'run-task',
                            task_id: taskId,
                            streaming: 'out'
                        },
                        payload: {
                            model: ttsParams.voice,
                            task_group: 'audio',
                            task: 'tts',
                            function: 'SpeechSynthesizer',
                            input: {
                                text: item.text
                            },
                            parameters: {
                                text_type: ttsParams.text_type,
                                format: ttsParams.format,
                                sample_rate: ttsParams.sample_rate,
                                volume: ttsParams.volume,
                                rate: ttsParams.rate,
                                pitch: ttsParams.pitch,
                                word_timestamp_enabled: ttsParams.word_timestamp_enabled,
                                phoneme_timestamp_enabled: ttsParams.phoneme_timestamp_enabled
                            }
                        }
                    };
                    
                    ws.send(JSON.stringify(runTaskMessage));
                });
                
                // 处理消息
                ws.on('message', async (data) => {
                    try {
                        // 尝试解析为JSON文本消息
                        let isTextMessage = false;
                        let message: WebSocketMessage = null;
                        let dataBuffer: Buffer = null;
                        
                        // 将RawData转换为Buffer以便处理
                        if (Buffer.isBuffer(data)) {
                            dataBuffer = data;
                        } else if (data instanceof ArrayBuffer) {
                            dataBuffer = Buffer.from(data);
                        } else if (typeof data === 'string') {
                            // 直接是字符串
                            isTextMessage = true;
                            try {
                                message = JSON.parse(data);
                            } catch (e) {
                                this.logger.error(`解析JSON失败: ${e.message}`);
                            }
                        } else {
                            // 处理其他可能的类型
                            try {
                                const strData = data.toString();
                                if (strData && strData.trim().startsWith('{')) {
                                    message = JSON.parse(strData);
                                    isTextMessage = true;
                                }
                            } catch (e) {
                                // 尝试转换为Buffer
                                try {
                                    dataBuffer = Buffer.from(data as any);
                                } catch (bufferErr) {}
                            }
                        }
                        
                        // 如果有Buffer但还未确定是否为文本消息，尝试解析
                        if (dataBuffer && !isTextMessage) {
                            try {
                                const dataStr = dataBuffer.toString('utf8');
                                // 检查是否以 { 开头，这是JSON的特征
                                if (dataStr.trim().startsWith('{')) {
                                    message = JSON.parse(dataStr);
                                    isTextMessage = true;
                                }
                            } catch (parseError) {
                                // 解析失败，说明不是JSON文本
                                isTextMessage = false;
                            }
                        }
                        
                        if (isTextMessage && message) {
                            // 处理JSON文本消息
                            switch (message.header.event) {
                                case 'task-started':
                                    taskStarted = true;
                                    break;
                                    
                                case 'result-generated':
                                    // 处理时间戳等信息，如果需要
                                    break;

                                case 'task-finished':
                                    // 关闭文件流
                                    outputFileStream.end(async () => {
                                        // 上传到OSS
                                        try {
                                            const ossResults = await this.ossService.uploadFiles([{
                                                fileName: `sambert_${taskId}.${ttsParams.format}`,
                                                filePath: outputFilePath
                                            }]);
                                            
                                            if (!ossResults || ossResults.length === 0) {
                                                throw new Error('上传音频到OSS返回了空结果');
                                            }
                                            
                                            // 创建结果对象
                                            const result: TaskResult = {
                                                taskId,
                                                status: 'completed',
                                                outputUrl: ossResults[0].fileURL,
                                                text: item.text,
                                                characterCount: message.payload?.usage?.characters || item.text.length,
                                                createdAt: new Date().toISOString(),
                                                updatedAt: new Date().toISOString()
                                            };
                                            
                                            // 清理临时文件
                                            this.cleanupFiles(filesToCleanup);
                                            
                                            // 关闭WebSocket连接
                                            if (ws.readyState === WebSocket.OPEN) {
                                                ws.close();
                                            }
                                            
                                            resolve(result);
                                        } catch (error) {
                                            this.logger.error(`上传到OSS失败:`, error);
                                            reject(new Error(`上传音频文件失败: ${error.message}`));
                                            
                                            // 清理临时文件
                                            this.cleanupFiles(filesToCleanup);
                                            
                                            // 关闭WebSocket连接
                                            if (ws.readyState === WebSocket.OPEN) {
                                                ws.close();
                                            }
                                        }
                                    });
                                    break;

                                case 'task-failed':
                                    taskFailed = true;
                                    const errorMessage = message.header.error_message || '任务执行失败';
                                    this.logger.error(`任务失败: ${errorMessage}`);
                                    
                                    // 清理临时文件
                                    this.cleanupFiles(filesToCleanup);
                                    
                                    // 关闭WebSocket连接
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.close();
                                    }
                                    
                                    reject(new Error(errorMessage));
                                    break;

                                default:
                                    // 处理其他事件
                                    break;
                            }
                        } else if (dataBuffer) {
                            // 确认为二进制音频数据
                            if (!audioDataReceived) {
                                audioDataReceived = true;
                            }
                            outputFileStream.write(dataBuffer);
                        }
                    } catch (error) {
                        this.logger.error(`处理WebSocket消息出错:`, error);
                        
                        if (!taskFailed) {
                            taskFailed = true;
                            // 清理临时文件
                            this.cleanupFiles(filesToCleanup);
                            
                            // 关闭WebSocket连接
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.close();
                            }
                            
                            reject(error);
                        }
                    }
                });
                
                // 处理WebSocket错误
                ws.on('error', (error) => {
                    this.logger.error(`WebSocket错误:`, error);
                    
                    if (!taskFailed) {
                        taskFailed = true;
                        
                        // 清理临时文件
                        this.cleanupFiles(filesToCleanup);
                        
                        // 关闭文件流
                        if (outputFileStream) {
                            outputFileStream.end();
                        }
                        
                        reject(new Error(`WebSocket连接错误: ${error.message}`));
                    }
                });
                
                // 处理WebSocket关闭
                ws.on('close', (code, reason) => {
                    this.logger.log(`WebSocket连接关闭: 代码=${code}, 原因=${reason || '未提供'}`);
                    
                    // 如果任务既没有失败也没有完成，标记为失败
                    if (!taskFailed && !taskStarted) {
                        // 清理临时文件
                        this.cleanupFiles(filesToCleanup);
                        
                        // 关闭文件流
                        if (outputFileStream) {
                            outputFileStream.end();
                        }
                        
                        reject(new Error(`WebSocket连接关闭: ${code} ${reason || '未知原因'}`));
                    }
                });
                
                // 设置超时处理
                setTimeout(() => {
                    if (!taskFailed && ws.readyState === WebSocket.OPEN) {
                        this.logger.warn(`任务执行超时 (1分钟)`);
                        
                        // 清理临时文件
                        this.cleanupFiles(filesToCleanup);
                        
                        // 关闭WebSocket连接
                        ws.close();
                        
                        reject(new Error('任务执行超时 (1分钟)'));
                    }
                }, 60000); // 1分钟超时
                
            } catch (error) {
                this.logger.error(`启动WebSocket任务失败:`, error);
                
                // 清理临时文件
                this.cleanupFiles(filesToCleanup);
                
                // 关闭WebSocket连接
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                
                // 关闭文件流
                if (outputFileStream) {
                    outputFileStream.end();
                }
                
                reject(new Error(`启动WebSocket任务失败: ${error.message}`));
            }
        });
    }
}

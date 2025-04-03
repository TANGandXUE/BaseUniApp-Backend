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
import { defaultVoices } from './voice-list.data';

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
}

@Injectable()
export class CosyvoiceAliyunService {
    private readonly logger = new Logger(CosyvoiceAliyunService.name);
    private readonly API_KEY = process.env.DASHSCOPE_API_KEY || '';
    private readonly WS_URL = process.env.COSYVOICE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
    private readonly POINTS_PER_CHARACTER = Number(process.env.COSYVOICE_POINTS_PER_CHARACTER || 0.1);
    private readonly TEMP_DIR = process.env.COSYVOICE_TEMP_DIR || 'temp/cosyvoice';
    private readonly DEFAULT_VOICE = process.env.COSYVOICE_DEFAULT_VOICE || 'xiaoyun';

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
        
        this.logger.log(`CosyvoiceAliyunService 初始化完成，配置：
            WS_URL: ${this.WS_URL}
            API_KEY: ${this.API_KEY ? '已配置' : '未配置'}
            POINTS_PER_CHARACTER: ${this.POINTS_PER_CHARACTER}
            TEMP_DIR: ${this.TEMP_DIR}
            DEFAULT_VOICE: ${this.DEFAULT_VOICE}
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
                sample_rate: params.sample_rate || 22050,
                volume: params.volume !== undefined ? params.volume : 50,
                rate: params.rate !== undefined ? params.rate : 1,
                pitch: params.pitch !== undefined ? params.pitch : 1
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
        this.logger.log(`[CosyVoice任务${taskId}] 开始处理WebSocket任务`);

        const startTime = Date.now();
        const filesToCleanup = [outputFilePath];
        let ws: WebSocket = null;
        let outputFileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
        let taskStarted = false;
        let taskFailed = false;
        let audioDataReceived = false;

        try {
            // 创建WebSocket连接
            this.logger.log(`[CosyVoice任务${taskId}] 准备建立WebSocket连接，URL: ${this.WS_URL}`);
            this.logger.log(`[CosyVoice任务${taskId}] 请求头: 
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
                this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接建立成功，准备发送run-task指令`);

                // 发送run-task指令
                const runTaskMessage: WebSocketMessage = {
                    header: {
                        action: 'run-task',
                        task_id: taskId,
                        streaming: 'duplex'
                    },
                    payload: {
                        task_group: 'audio',
                        task: 'tts',
                        function: 'SpeechSynthesizer',
                        model: 'cosyvoice-v1',
                        parameters: ttsParams,                   
                        input: {}
                    }
                };
                
                const messageStr = JSON.stringify(runTaskMessage);
                this.logger.log(`[CosyVoice任务${taskId}] 发送run-task指令: ${messageStr}`);
                ws.send(messageStr);
                
                this.logger.log(`[CosyVoice任务${taskId}] run-task指令已发送`);
            });

            // 处理WebSocket消息
            ws.on('message', async (data) => {
                try {
                    this.logger.log(`[CosyVoice任务${taskId}] 收到消息类型: ${typeof data}`);
                    
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
                            this.logger.log(`[CosyVoice任务${taskId}] 直接识别为JSON文本消息`);
                        } catch (e) {
                            this.logger.error(`[CosyVoice任务${taskId}] 字符串解析JSON失败: ${e.message}`);
                        }
                    } else {
                        // 处理其他可能的类型
                        try {
                            const strData = data.toString();
                            if (strData && strData.trim().startsWith('{')) {
                                message = JSON.parse(strData);
                                isTextMessage = true;
                                this.logger.log(`[CosyVoice任务${taskId}] 其他类型转换为JSON成功`);
                            }
                        } catch (e) {
                            this.logger.error(`[CosyVoice任务${taskId}] 未知类型转换失败: ${e.message}`);
                            // 尝试转换为Buffer
                            try {
                                dataBuffer = Buffer.from(data as any);
                            } catch (bufferErr) {
                                this.logger.error(`[CosyVoice任务${taskId}] 无法转换为Buffer: ${bufferErr.message}`);
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
                                this.logger.log(`[CosyVoice任务${taskId}] Buffer解析为JSON成功: ${dataStr}`);
                            }
                        } catch (parseError) {
                            // 解析失败，说明不是JSON文本
                            isTextMessage = false;
                            this.logger.log(`[CosyVoice任务${taskId}] Buffer不是JSON文本，确认为二进制数据`);
                        }
                    }
                    
                    if (isTextMessage && message) {
                        // 处理JSON文本消息
                        this.logger.log(`[CosyVoice任务${taskId}] 解析后的消息: ${JSON.stringify(message, null, 2)}`);
                        this.logger.log(`[CosyVoice任务${taskId}] 收到事件: ${message.header.event}`);

                        switch (message.header.event) {
                            case 'task-started':
                                taskStarted = true;
                                this.logger.log(`[CosyVoice任务${taskId}] 任务已开始，准备发送文本`);

                                // 发送continue-task指令
                                const continueTaskMessage: WebSocketMessage = {
                                    header: {
                                        action: 'continue-task',
                                        task_id: taskId,
                                        streaming: 'duplex'
                                    },
                                    payload: {
                                        input: {
                                            text: text
                                        }
                                    }
                                };
                                
                                const continueTaskMessageStr = JSON.stringify(continueTaskMessage);
                                this.logger.log(`[CosyVoice任务${taskId}] 发送continue-task指令: ${continueTaskMessageStr}`);
                                ws.send(continueTaskMessageStr);
                                
                                this.logger.log(`[CosyVoice任务${taskId}] continue-task指令已发送，准备过1秒发送finish-task指令`);

                                // 发送finish-task指令
                                setTimeout(() => {
                                    if (ws.readyState === WebSocket.OPEN) {
                                        this.logger.log(`[CosyVoice任务${taskId}] 准备发送finish-task指令`);
                                        const finishTaskMessage: WebSocketMessage = {
                                            header: {
                                                action: 'finish-task',
                                                task_id: taskId,
                                                streaming: 'duplex'
                                            },
                                            payload: {
                                                input: {}
                                            }
                                        };
                                        
                                        const finishTaskMessageStr = JSON.stringify(finishTaskMessage);
                                        this.logger.log(`[CosyVoice任务${taskId}] 发送finish-task指令: ${finishTaskMessageStr}`);
                                        ws.send(finishTaskMessageStr);
                                        
                                        this.logger.log(`[CosyVoice任务${taskId}] finish-task指令已发送`);
                                    } else {
                                        this.logger.warn(`[CosyVoice任务${taskId}] WebSocket连接已关闭，无法发送finish-task指令`);
                                    }
                                }, 1000); // 等待1秒后发送结束指令
                                break;

                            case 'task-finished':
                                const useTime = Date.now() - startTime;
                                this.logger.log(`[CosyVoice任务${taskId}] 任务完成，耗时: ${useTime}ms`);
                                this.logger.log(`[CosyVoice任务${taskId}] 任务完成详细信息: ${JSON.stringify(message.payload, null, 2)}`);
                                this.logger.log(`[CosyVoice任务${taskId}] 使用字符数: ${message.payload?.usage?.characters || charCount}`);

                                // 关闭文件流
                                outputFileStream.end(() => {
                                    this.logger.log(`[CosyVoice任务${taskId}] 音频文件写入完成，检查文件大小: ${fs.statSync(outputFilePath).size} 字节`);
                                    this.logger.log(`[CosyVoice任务${taskId}] 准备上传到OSS`);

                                    // 上传到OSS
                                    this.ossService.uploadFiles([{
                                        fileName: `cosyvoice_${taskId}.${ttsParams.format}`,
                                        filePath: outputFilePath
                                    }]).then(ossResults => {
                                        if (!ossResults || ossResults.length === 0) {
                                            throw new Error('上传音频到OSS返回了空结果');
                                        }

                                        this.logger.log(`[CosyVoice任务${taskId}] 上传OSS成功: ${JSON.stringify(ossResults, null, 2)}`);

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
                                        
                                        this.logger.log(`[CosyVoice任务${taskId}] 更新任务记录: ${JSON.stringify(updateData, null, 2)}`);
                                        
                                        this.taskRecordsService.updateTaskRecord(updateData).then(() => {
                                            this.logger.log(`[CosyVoice任务${taskId}] 任务记录更新成功`);

                                            // 扣除用户点数
                                            const pointsToDeduct = charCount * (ttsParams.format === 'mp3' ? 0.1 : 0.05);
                                            this.logger.log(`[CosyVoice任务${taskId}] 准备扣除用户点数: ${pointsToDeduct}`);
                                            
                                            this.sqlService.deductPointsWithCheck(user, pointsToDeduct)
                                                .then((deductResult) => {
                                                    this.logger.log(`[CosyVoice任务${taskId}] 用户点数扣除成功: ${JSON.stringify(deductResult, null, 2)}`);
                                                })
                                                .catch(err => {
                                                    this.logger.error(`[CosyVoice任务${taskId}] 扣除点数失败:`, err);
                                                });
                                        }).catch(updateError => {
                                            this.logger.error(`[CosyVoice任务${taskId}] 更新任务记录失败:`, updateError);
                                        });

                                        // 清理临时文件
                                        this.cleanupFiles(filesToCleanup);
                                    }).catch(error => {
                                        this.logger.error(`[CosyVoice任务${taskId}] 上传到OSS失败:`, error);
                                        
                                        const failedData = {
                                            historyId,
                                            historyStatus: 'failed',
                                            historyUseTime: useTime,
                                            historyErrorInfos: [{
                                                errorMessage: `上传音频文件失败: ${error.message}`,
                                                errorDetails: error
                                            }]
                                        };
                                        
                                        this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态: ${JSON.stringify(failedData, null, 2)}`);
                                        
                                        this.taskRecordsService.updateTaskRecord(failedData);
                                        this.cleanupFiles(filesToCleanup);
                                    });
                                });
                                break;

                            case 'task-failed':
                                taskFailed = true;
                                this.logger.error(`[CosyVoice任务${taskId}] 任务失败:`);
                                this.logger.error(`[CosyVoice任务${taskId}] 错误代码: ${message.header.error_code}`);
                                this.logger.error(`[CosyVoice任务${taskId}] 错误消息: ${message.header.error_message}`);
                                this.logger.error(`[CosyVoice任务${taskId}] 完整错误详情: ${JSON.stringify(message, null, 2)}`);

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
                                
                                this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态: ${JSON.stringify(failData, null, 2)}`);
                                
                                await this.taskRecordsService.updateTaskRecord(failData);

                                // 清理临时文件
                                await this.cleanupFiles(filesToCleanup);

                                // 关闭WebSocket连接
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.close();
                                    this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接已主动关闭`);
                                }
                                break;

                            default:
                                this.logger.log(`[CosyVoice任务${taskId}] 收到其他事件: ${message.header.event}`);
                                this.logger.log(`[CosyVoice任务${taskId}] 完整消息: ${JSON.stringify(message, null, 2)}`);
                                break;
                        }
                    } else if (dataBuffer) {
                        // 确认为二进制音频数据
                        this.logger.log(`[CosyVoice任务${taskId}] 处理二进制音频数据，大小: ${dataBuffer.length} 字节`);
                        if (!audioDataReceived) {
                            audioDataReceived = true;
                            this.logger.log(`[CosyVoice任务${taskId}] 收到第一块音频数据，大小: ${dataBuffer.length} 字节`);
                        }
                        outputFileStream.write(dataBuffer);
                    } else {
                        // 无法处理的数据类型
                        this.logger.warn(`[CosyVoice任务${taskId}] 收到无法处理的数据类型: ${typeof data}`);
                    }
                } catch (error) {
                    this.logger.error(`[CosyVoice任务${taskId}] 处理WebSocket消息出错:`, error);
                    this.logger.error(`[CosyVoice任务${taskId}] 错误堆栈: ${error.stack}`);
                    
                    // 尝试记录数据信息便于调试
                    try {
                        if (Buffer.isBuffer(data)) {
                            this.logger.error(`[CosyVoice任务${taskId}] 错误发生在处理Buffer数据，长度: ${data.length} 字节`);
                        } else if (data instanceof ArrayBuffer) {
                            this.logger.error(`[CosyVoice任务${taskId}] 错误发生在处理ArrayBuffer数据，长度: ${data.byteLength} 字节`);
                        } else if (typeof data === 'string') {
                            const dataStr = data as string; // 确保类型为字符串
                            this.logger.error(`[CosyVoice任务${taskId}] 错误发生在处理字符串数据，内容: ${dataStr.substring(0, 100)}${dataStr.length > 100 ? '...(已截断)' : ''}`);
                        } else {
                            this.logger.error(`[CosyVoice任务${taskId}] 错误发生在处理未知类型数据: ${typeof data}`);
                        }
                    } catch (logError) {
                        this.logger.error(`[CosyVoice任务${taskId}] 记录错误数据信息时出错:`, logError);
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
                        
                        this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态: ${JSON.stringify(errorData, null, 2)}`);
                        
                        await this.taskRecordsService.updateTaskRecord(errorData);
                        
                        taskFailed = true;
                    }

                    // 清理临时文件
                    await this.cleanupFiles(filesToCleanup);

                    // 关闭WebSocket连接
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                        this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接已主动关闭 (出错后关闭)`);
                    }
                }
            });

            // 处理WebSocket错误
            ws.on('error', async (error) => {
                this.logger.error(`[CosyVoice任务${taskId}] WebSocket错误:`, error);
                this.logger.error(`[CosyVoice任务${taskId}] 错误堆栈: ${error.stack}`);

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
                    
                    this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态 (WebSocket错误): ${JSON.stringify(errorData, null, 2)}`);
                    
                    await this.taskRecordsService.updateTaskRecord(errorData);
                    
                    taskFailed = true;
                }

                // 清理临时文件
                await this.cleanupFiles(filesToCleanup);

                // 关闭文件流
                if (outputFileStream) {
                    outputFileStream.end(() => {
                        this.logger.log(`[CosyVoice任务${taskId}] 音频文件流已关闭 (WebSocket错误)`);
                    });
                }
            });

            // 处理WebSocket关闭
            ws.on('close', (code, reason) => {
                this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接关闭: 代码=${code}, 原因=${reason || '未提供'}`);

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
                    
                    this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态 (WebSocket关闭): ${JSON.stringify(closeData, null, 2)}`);
                    
                    this.taskRecordsService.updateTaskRecord(closeData);
                }

                // 关闭文件流
                if (outputFileStream) {
                    outputFileStream.end(() => {
                        this.logger.log(`[CosyVoice任务${taskId}] 音频文件流已关闭 (WebSocket关闭)`);
                        
                        // 检查文件是否为空
                        try {
                            const stats = fs.statSync(outputFilePath);
                            this.logger.log(`[CosyVoice任务${taskId}] 音频文件大小: ${stats.size} 字节`);
                            if (stats.size === 0) {
                                this.logger.warn(`[CosyVoice任务${taskId}] 警告: 生成的音频文件为空`);
                            }
                        } catch (err) {
                            this.logger.error(`[CosyVoice任务${taskId}] 检查音频文件失败:`, err);
                        }
                    });
                }
            });

            // 设置超时处理
            setTimeout(async () => {
                if (!taskFailed && ws.readyState === WebSocket.OPEN) {
                    this.logger.warn(`[CosyVoice任务${taskId}] 任务执行超时 (2分钟)`);

                    // 更新任务记录
                    const timeoutData = {
                        historyId,
                        historyStatus: 'failed',
                        historyUseTime: Date.now() - startTime,
                        historyErrorInfos: [{
                            errorMessage: '任务执行超时 (2分钟)'
                        }]
                    };
                    
                    this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态 (超时): ${JSON.stringify(timeoutData, null, 2)}`);
                    
                    await this.taskRecordsService.updateTaskRecord(timeoutData);

                    // 清理临时文件
                    await this.cleanupFiles(filesToCleanup);

                    // 关闭WebSocket连接
                    ws.close();
                    this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接已主动关闭 (超时)`);
                }
            }, 120000); // 2分钟超时
        } catch (error) {
            this.logger.error(`[CosyVoice任务${taskId}] 启动WebSocket任务失败:`, error);
            this.logger.error(`[CosyVoice任务${taskId}] 错误堆栈: ${error.stack}`);

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
            
            this.logger.log(`[CosyVoice任务${taskId}] 更新为失败状态 (启动失败): ${JSON.stringify(startErrorData, null, 2)}`);
            
            await this.taskRecordsService.updateTaskRecord(startErrorData);

            // 清理临时文件
            await this.cleanupFiles(filesToCleanup);

            // 关闭WebSocket连接
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
                this.logger.log(`[CosyVoice任务${taskId}] WebSocket连接已主动关闭 (启动失败)`);
            }

            // 关闭文件流
            if (outputFileStream) {
                outputFileStream.end(() => {
                    this.logger.log(`[CosyVoice任务${taskId}] 音频文件流已关闭 (启动失败)`);
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
    async getVoiceList(userId?: number): Promise<any> {
        this.logger.log(`获取语音列表，用户ID: ${userId || '未登录'}`);
        
        // 获取默认音色列表
        const systemVoices = defaultVoices;
        
        let finalVoiceList = [...systemVoices];
        
        // 如果提供了用户ID，获取用户的自定义音色
        if (userId) {
            try {
                const userVoicesResult = await this.voiceCloneService.getUserVoices(userId);
                
                if (userVoicesResult.isSuccess && userVoicesResult.data && userVoicesResult.data.length > 0) {
                    const userVoices = userVoicesResult.data.map(voice => {
                        return {
                            id: voice.ClonedVoiceId,
                            name: voice.ClonedVoiceName,
                            gender: 'unknown', // 可以在克隆音色表中添加性别字段
                            description: '用户自定义音色',
                            sample_url: '', // 可以提供一个试听接口URL
                            model: 'cosyvoice-v1',
                            scenarios: ['语音助手', '聊天数字人', '自定义应用'],
                            language: '中文',
                            default_sample_rate: 22050,
                            default_format: 'mp3',
                            is_custom: true,
                            create_time: voice.ClonedVoiceCreateTime,
                            update_time: voice.ClonedVoiceUpdateTime
                        };
                    });
                    
                    // 将用户自定义音色放在列表前面（置顶）
                    finalVoiceList = [...userVoices, ...systemVoices];
                    
                    this.logger.log(`找到${userVoices.length}个用户自定义音色`);
                }
            } catch (error) {
                this.logger.error(`获取用户自定义音色失败:`, error);
                // 即使获取用户音色失败，仍返回默认音色列表
            }
        }
        
        this.logger.log(`返回${finalVoiceList.length}个音色列表`);

        return {
            isSuccess: true,
            message: '获取语音列表成功',
            data: finalVoiceList
        };
    }
}
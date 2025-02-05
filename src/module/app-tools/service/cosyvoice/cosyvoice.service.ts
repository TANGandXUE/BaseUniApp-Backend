import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from 'src/module/apps/service/app-list/app-list.service';
import { OssService } from '../../../sql/service/oss/oss.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

@Injectable()
export class CosyvoiceService {
    private readonly baseUrl: string;
    private readonly silentGapMs: number;

    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService,
        private readonly ossService: OssService
    ) {
        this.baseUrl = process.env.COSYVOICE_BASE_URL || 'http://47.101.212.30:50000';
        this.silentGapMs = Number(process.env.COSYVOICE_SILENT_GAP_MS) || 300;
    }

    private createSilentWavBuffer(durationMs: number): Buffer {
        const WAV_HEADER_SIZE = 44;
        const sampleRate = 44100;  // 标准采样率
        const channels = 1;        // 单声道
        const bitDepth = 16;       // 16位
        const bytesPerSample = bitDepth / 8;
        
        // 计算数据大小
        const numSamples = Math.floor(sampleRate * durationMs / 1000);
        const dataSize = numSamples * channels * bytesPerSample;
        const fileSize = dataSize + WAV_HEADER_SIZE;
        
        // 创建buffer
        const buffer = Buffer.alloc(fileSize);
        
        // 写入WAV头部
        buffer.write('RIFF', 0);                          // ChunkID
        buffer.writeUInt32LE(fileSize - 8, 4);           // ChunkSize
        buffer.write('WAVE', 8);                         // Format
        buffer.write('fmt ', 12);                        // Subchunk1ID
        buffer.writeUInt32LE(16, 16);                    // Subchunk1Size
        buffer.writeUInt16LE(1, 20);                     // AudioFormat (PCM)
        buffer.writeUInt16LE(channels, 22);              // NumChannels
        buffer.writeUInt32LE(sampleRate, 24);            // SampleRate
        buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // ByteRate
        buffer.writeUInt16LE(channels * bytesPerSample, 32); // BlockAlign
        buffer.writeUInt16LE(bitDepth, 34);             // BitsPerSample
        buffer.write('data', 36);                       // Subchunk2ID
        buffer.writeUInt32LE(dataSize, 40);             // Subchunk2Size
        
        // 数据部分全部填充0（静音）
        buffer.fill(0, WAV_HEADER_SIZE);
        
        return buffer;
    }

    private async processResponse(eventId: string): Promise<any[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/gradio_api/call/generate_audio/${eventId}`
            );

            // 解析返回的文本数据
            const responseText = response.data;
            console.log('原始响应数据:', responseText);

            // 解析所有事件
            const lines = responseText.split('\n');
            const audioSegments: any[] = [];
            let currentEvent = '';

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (line.startsWith('event: ')) {
                    currentEvent = line.slice(7);
                    continue;
                }

                if (line.startsWith('data: ') && currentEvent === 'generating') {
                    const data = line.slice(6); // 移除 "data: " 前缀
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed[0] && parsed[0].url) {
                            // 处理URL格式
                            const originalUrl = parsed[0].url;
                            const formattedUrl = originalUrl
                                .replace('gradio_a/gradio_api', 'gradio_api')
                                .replace(/file=([^&]+)/, (match, p1) => {
                                    return 'file=' + p1.replace(/\\/g, '/');
                                });

                            audioSegments.push({
                                ...parsed[0],
                                url: formattedUrl
                            });
                        }
                    } catch (e) {
                        console.error('解析音频段数据失败:', e);
                    }
                }
            }

            if (audioSegments.length === 0) {
                throw new Error('未找到任何音频段');
            }

            console.log(`找到 ${audioSegments.length} 个音频段`);
            return audioSegments;
        } catch (error) {
            console.error('获取音频数据失败:', error);
            throw error;
        }
    }

    private async downloadAndConcatAudio(audioSegments: any[]): Promise<Buffer> {
        const audioBuffers: Buffer[] = [];
        let totalSize = 0;
        let totalDataSize = 0;
        const WAV_HEADER_SIZE = 44;

        // 下载所有音频段
        for (let i = 0; i < audioSegments.length; i++) {
            console.log(`下载第 ${i + 1}/${audioSegments.length} 个音频段`);
            const response = await axios.get(audioSegments[i].url, {
                responseType: 'arraybuffer'
            });
            const buffer = Buffer.from(response.data);
            console.log(`第 ${i + 1} 段音频大小: ${buffer.length} 字节`);
            
            // 如果不是最后一个音频段，添加静音间隔
            if (i < audioSegments.length - 1) {
                const silentBuffer = this.createSilentWavBuffer(this.silentGapMs);
                totalDataSize += buffer.length - WAV_HEADER_SIZE + silentBuffer.length - WAV_HEADER_SIZE;
                audioBuffers.push(buffer);
                audioBuffers.push(silentBuffer);
            } else {
                totalDataSize += buffer.length - WAV_HEADER_SIZE;
                audioBuffers.push(buffer);
            }
            totalSize += buffer.length;
        }

        // 从第一个文件获取采样率等信息
        const firstBuffer = audioBuffers[0];
        const header = Buffer.alloc(WAV_HEADER_SIZE);
        firstBuffer.copy(header, 0, 0, WAV_HEADER_SIZE);

        // 创建新的合并后的buffer
        const finalBuffer = Buffer.alloc(WAV_HEADER_SIZE + totalDataSize);
        
        // 复制头部
        header.copy(finalBuffer, 0, 0, WAV_HEADER_SIZE);
        
        // 更新头部中的文件大小信息
        finalBuffer.writeUInt32LE(totalDataSize + 36, 4);
        finalBuffer.writeUInt32LE(totalDataSize, 40);

        // 依次复制每个音频文件的数据部分（跳过头部）
        let offset = WAV_HEADER_SIZE;
        for (const buffer of audioBuffers) {
            buffer.copy(finalBuffer, offset, WAV_HEADER_SIZE);
            offset += buffer.length - WAV_HEADER_SIZE;
        }

        console.log('原始音频总大小:', totalSize, '字节');
        console.log('合并后的音频大小:', finalBuffer.length, '字节');
        console.log('音频数据部分大小:', totalDataSize, '字节');
        
        return finalBuffer;
    }

    /**
     * 处理语音生成任务状态并更新记录
     */
    private async processVoiceTask(eventId: string, historyId: number, user: {
        userId: number;
        userPhone: string;
        userEmail: string;
        userPoints: number;
    }, appCostConfig: any) {
        try {
            // 获取所有音频段
            const audioSegments = await this.processResponse(eventId);
            console.log('获取到的音频段数:', audioSegments.length);

            // 下载并合并所有音频段
            const audioBuffer = await this.downloadAndConcatAudio(audioSegments);
            console.log('最终合并后的音频文件大小:', audioBuffer.length, '字节');

            // 确保临时目录存在
            const tempDir = path.join(process.cwd(), 'temp');
            await mkdir(tempDir, { recursive: true });
            
            // 生成临时文件路径
            const tempFilePath = path.join(tempDir, `${eventId}.wav`);
            
            // 将音频数据写入临时文件
            await writeFile(tempFilePath, audioBuffer);
            
            // 验证写入的文件大小
            const stats = fs.statSync(tempFilePath);
            console.log('写入到临时文件的大小:', stats.size, '字节');

            // 上传到OSS
            const fileName = `audio/${eventId}.wav`;
            const uploadResults = await this.ossService.uploadFiles([{
                fileName,
                filePath: tempFilePath
            }]);

            // 删除临时文件
            fs.unlinkSync(tempFilePath);

            // 更新任务记录
            await this.taskRecordsService.updateTaskRecord({
                historyId,
                historyStatus: 'success',
                historyUseTime: 0,
                historyResult: [{
                    eventId,
                    audioUrl: uploadResults[0].fileURL,
                    createdAt: new Date(),
                }]
            });

            // 扣除积分
            await this.sqlService.deductPointsWithCheck(user, appCostConfig.voiceGenerate.cost);
        } catch (error) {
            console.error('处理语音生成任务失败:', error);
            await this.taskRecordsService.updateTaskRecord({
                historyId,
                historyStatus: 'failed',
                historyUseTime: 0,
                historyErrorInfos: [{
                    errorMessage: error.message
                }]
            });
        }
    }

    private async downloadAudioFile(url: string): Promise<Buffer | null> {
        if (!url) return null;
        
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('下载音频文件失败:', error);
            return null;
        }
    }

    async submitVoiceTask(
        params: {
            tts_text: string;
            mode_checkbox_group: string;
            sft_dropdown: string;
            prompt_text: string;
            prompt_wav_upload: string;
            prompt_wav_record: string;
            instruct_text: string;
            seed: number;
            stream: boolean;
            speed: number;
        },
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        }
    ): Promise<any> {
        try {
            // 检查余额是否充足
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === 6)?.AppCostConfig;
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, appCostConfig.voiceGenerate.cost);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: '余额不足',
                    data: null,
                }
            }

            // 下载音频文件
            const uploadedAudioBuffer = await this.downloadAudioFile(params.prompt_wav_upload);
            const recordedAudioBuffer = await this.downloadAudioFile(params.prompt_wav_record);

            // 调用上游API获取event_id
            const response = await axios.post(
                `${this.baseUrl}/gradio_api/call/generate_audio`,
                {
                    data: [
                        params.tts_text,
                        params.mode_checkbox_group,
                        params.sft_dropdown,
                        params.prompt_text,
                        uploadedAudioBuffer ? {
                            path: "audio.wav",
                            orig_name: "audio.wav",
                            data: uploadedAudioBuffer.toString('base64'),
                            size: uploadedAudioBuffer.length,
                            mime_type: "audio/wav",
                            is_file: true,
                            meta: { _type: "gradio.FileData" }
                        } : null,
                        recordedAudioBuffer ? {
                            path: "audio.wav",
                            orig_name: "audio.wav",
                            data: recordedAudioBuffer.toString('base64'),
                            size: recordedAudioBuffer.length,
                            mime_type: "audio/wav",
                            is_file: true,
                            meta: { _type: "gradio.FileData" }
                        } : null,
                        params.instruct_text,
                        params.seed,
                        params.stream,
                        params.speed
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.event_id) {
                // 创建任务记录
                const taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 6,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: appCostConfig.voiceGenerate.cost,
                    historyResult: [{ eventId: response.data.event_id }],
                    historyErrorInfos: []
                });

                // 异步处理任务
                this.processVoiceTask(response.data.event_id, taskRecord.historyId, user, appCostConfig);

                return {
                    isSuccess: true,
                    message: '提交语音生成任务成功',
                    data: taskRecord.historyId,
                }
            } else {
                return {
                    isSuccess: false,
                    message: '提交语音生成任务失败',
                    data: null,
                }
            }
        } catch (error) {
            console.error('提交语音生成任务失败:', error);
            return {
                isSuccess: false,
                message: `提交语音生成任务失败: ${error.message}`,
                data: null,
            }
        }
    }

    /**
     * 从数据库查询任务状态
     */
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
                data: null,
            }
        }
    }
}

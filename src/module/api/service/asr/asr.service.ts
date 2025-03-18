import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AsrService {
    private readonly baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
    private readonly apiKey = process.env.ALIYUN_ASR_API_KEY;

    /**
     * 轮询任务状态并获取结果
     */
    private async pollTaskStatus(taskId: string): Promise<any> {
        let retryCount = 0;
        const maxRetries = 1000;
        const interval = 300; // 0.3秒

        while (retryCount < maxRetries) {
            try {
                const response = await axios.post(
                    `${this.baseUrl}/tasks/${taskId}`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const status = response.data.output.task_status;
                console.log(`[ASR任务${taskId}] 当前状态: ${status}`);

                if (status === 'SUCCEEDED') {
                    // 获取识别结果
                    const results = response.data.output.results;
                    const transcriptionResults = await Promise.all(
                        results.map(async (result) => {
                            if (result.subtask_status === 'SUCCEEDED') {
                                const transcriptionResponse = await axios.get(result.transcription_url);
                                return transcriptionResponse.data;
                            }
                            return null;
                        })
                    );

                    return {
                        isSuccess: true,
                        message: '语音识别成功',
                        data: transcriptionResults
                    };
                } else if (status === 'FAILED') {
                    console.error(`[ASR任务${taskId}] 语音识别失败: ${JSON.stringify(response.data)}`);
                    return {
                        isSuccess: false,
                        message: '语音识别失败',
                        data: null
                    };
                }

                // 任务仍在处理中，等待后继续轮询
                await new Promise(resolve => setTimeout(resolve, interval));
                retryCount++;
            } catch (error) {
                console.error(`[ASR任务${taskId}] 查询失败:`, error);
                return {
                    isSuccess: false,
                    message: `查询任务状态失败: ${error.message}`,
                    data: null
                };
            }
        }

        return {
            isSuccess: false,
            message: '任务执行超时',
            data: null
        };
    }

    /**
     * 提交语音识别任务
     */
    async submitTranscriptionTask(fileUrls: string[]): Promise<any> {
        console.log('提交ASR任务:', fileUrls);
        try {
            const response = await axios.post(
                `${this.baseUrl}/services/audio/asr/transcription`,
                {
                    model: 'paraformer-v2',
                    input: {
                        file_urls: fileUrls
                    },
                    parameters: {
                        channel_id: [0],
                        language_hints: ['zh', 'en'],
                        disfluency_removal_enabled: false,
                        timestamp_alignment_enabled: false,
                        diarization_enabled: false
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'X-DashScope-Async': 'enable'
                    }
                }
            );

            if (response.data.output?.task_id) {
                // 开始轮询任务状态
                return await this.pollTaskStatus(response.data.output.task_id);
            } else {
                return {
                    isSuccess: false,
                    message: '提交任务失败',
                    data: null
                };
            }
        } catch (error) {
            console.error('提交ASR任务失败:', error);
            return {
                isSuccess: false,
                message: `提交任务失败: ${error.message}`,
                data: null
            };
        }
    }
}

import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { HistoryInfo } from 'src/entities/historyInfo.entity';

// OpenAI配置接口
interface OpenAIConfig {
    apiKey: string;
    organization?: string;
    baseURL?: string;
    timeout?: number;
}

// 对话消息接口
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

// 对话记录接口
interface ChatHistory {
    messages: ChatMessage[];
    model: string;
    totalTokens?: number;
    startTime: number;
    endTime?: number;
    currentAssistantMessage?: string; // 用于收集流式回复的内容
}

@Injectable()
export class ChatService {
    private openai: OpenAI;
    private readonly defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
    private readonly defaultTemperature = Number(process.env.OPENAI_DEFAULT_TEMPERATURE) || 0.7;
    private readonly defaultMaxTokens = Number(process.env.OPENAI_DEFAULT_MAX_TOKENS) || 2000;
    private chatHistories: Map<number, ChatHistory> = new Map();

    constructor(
        private readonly taskRecordsService: TaskRecordsService
    ) {
        // 从环境变量获取配置
        const config: OpenAIConfig = {
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        };

        // 初始化OpenAI客户端
        this.openai = new OpenAI(config);
    }

    // 初始化或获取对话历史
    private async initOrGetChatHistory(
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number, 
        model: string = this.defaultModel
    ): Promise<{ historyId: number; isNew: boolean }> {
        if (!historyId) {
            // 创建新的历史记录
            const newHistory: Partial<HistoryInfo> = {
                historyUserId: user.userId, // 从用户信息中获取userId
                historyAppId: 5,  // Chat应用的historyAppId是5
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: 0,
                historyResult: [],
                historyErrorInfos: []
            };
            console.log('[Chat History] 创建新的历史记录:', newHistory);
            const result = await this.taskRecordsService.writeTaskRecord(newHistory);
            console.log('[Chat History] 写入新历史记录结果:', result);
            historyId = result.historyId;
        }

        // 初始化或获取聊天历史
        if (!this.chatHistories.has(historyId)) {
            console.log('[Chat History] 初始化内存中的聊天历史, historyId:', historyId);
            this.chatHistories.set(historyId, {
                messages: [],
                model,
                startTime: Date.now(),
                totalTokens: 0,
                currentAssistantMessage: '' // 初始化当前助手回复
            });
        }

        return { historyId, isNew: !this.chatHistories.has(historyId) };
    }

    // 更新对话历史记录
    private async updateChatHistory(historyId: number, message: ChatMessage) {
        console.log('[Chat History] 准备更新对话历史, historyId:', historyId);
        console.log('[Chat History] 新消息:', message);
        
        const history = this.chatHistories.get(historyId);
        if (history) {
            history.messages.push({ ...message, timestamp: Date.now() });
            console.log('[Chat History] 当前内存中的所有消息:', history.messages);
            
            // 更新历史记录
            const updateData = {
                historyId,
                historyStatus: 'processing',
                historyUseTime: Date.now() - history.startTime,
                historyResult: history.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp
                }))
            };
            console.log('[Chat History] 准备更新到数据库的数据:', updateData);
            await this.taskRecordsService.updateTaskRecord(updateData);
        } else {
            console.log('[Chat History] 警告: 未找到对应的历史记录, historyId:', historyId);
        }
    }

    // 完成对话
    private async completeChatHistory(historyId: number) {
        console.log('[Chat History] 准备完成对话, historyId:', historyId);
        const history = this.chatHistories.get(historyId);
        if (history) {
            history.endTime = Date.now();
            
            // 更新历史记录状态为已完成
            const finalData = {
                historyId,
                historyStatus: 'completed',
                historyUseTime: history.endTime - history.startTime,
                historyResult: history.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp
                }))
            };
            console.log('[Chat History] 保存最终对话数据:', finalData);
            await this.taskRecordsService.updateTaskRecord(finalData);
            
            // 清理内存中的对话历史
            this.chatHistories.delete(historyId);
            console.log('[Chat History] 已清理内存中的对话历史');
        } else {
            console.log('[Chat History] 警告: 完成对话时未找到历史记录, historyId:', historyId);
        }
    }

    /**
     * 发送多轮对话消息(流式)
     */
    async streamChatMessages(
        messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>, 
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number,
        options?: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        },
        abortController?: AbortController
    ) {
        try {
            console.log('[Chat Stream] 开始流式对话, 输入消息:', messages);
            console.log('[Chat Stream] 历史ID:', historyId);
            console.log('[Chat Stream] 用户信息:', user);
            
            const { historyId: finalHistoryId } = await this.initOrGetChatHistory(user, historyId, options?.model);
            console.log('[Chat Stream] 最终使用的历史ID:', finalHistoryId);
            
            // 记录用户消息
            await this.updateChatHistory(finalHistoryId, messages[messages.length - 1]);

            const stream = await this.openai.chat.completions.create({
                messages,
                model: options?.model || this.defaultModel,
                temperature: options?.temperature || this.defaultTemperature,
                max_tokens: options?.maxTokens || this.defaultMaxTokens,
                stream: true,
            }, {
                signal: abortController?.signal
            });

            // 获取历史记录对象
            const history = this.chatHistories.get(finalHistoryId);
            if (history) {
                history.currentAssistantMessage = ''; // 重置当前助手回复
                console.log('[Chat Stream] 重置当前助手回复');
            }

            // 包装stream以收集完整回复
            const wrappedStream = {
                [Symbol.asyncIterator]: async function* () {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content && history) {
                            history.currentAssistantMessage += content;
                            console.log('[Chat Stream] 累积的助手回复:', history.currentAssistantMessage);
                        }
                        yield chunk;
                    }
                    // 流结束时，保存完整的助手回复
                    if (history && history.currentAssistantMessage) {
                        console.log('[Chat Stream] 流结束，保存完整的助手回复:', history.currentAssistantMessage);
                        await this.updateChatHistory(finalHistoryId, {
                            role: 'assistant',
                            content: history.currentAssistantMessage
                        });
                        history.currentAssistantMessage = '';
                    }
                }.bind(this)
            };

            return { stream: wrappedStream, historyId: finalHistoryId };
        } catch (error) {
            console.error('[Chat Stream] 错误:', error);
            throw error;
        }
    }

    /**
     * 发送多轮对话消息(非流式)
     */
    async sendChatMessages(
        messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>, 
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number,
        options?: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ) {
        try {
            const { historyId: finalHistoryId } = await this.initOrGetChatHistory(user, historyId, options?.model);
            
            // 记录用户消息
            await this.updateChatHistory(finalHistoryId, messages[messages.length - 1]);

            const completion = await this.openai.chat.completions.create({
                messages,
                model: options?.model || this.defaultModel,
                temperature: options?.temperature || this.defaultTemperature,
                max_tokens: options?.maxTokens || this.defaultMaxTokens,
            });

            // 记录助手回复
            await this.updateChatHistory(finalHistoryId, completion.choices[0].message);

            return {
                success: true,
                message: '对话消息发送成功',
                data: {
                    response: completion.choices[0].message,
                    historyId: finalHistoryId
                }
            };
        } catch (error) {
            return {
                success: false,
                message: '对话消息发送失败',
                error: error.message
            };
        }
    }

    /**
     * 结束对话
     */
    async endChat(historyId: number) {
        try {
            await this.completeChatHistory(historyId);
            return {
                success: true,
                message: '对话已结束',
                data: { historyId }
            };
        } catch (error) {
            return {
                success: false,
                message: '结束对话失败',
                error: error.message
            };
        }
    }

    /**
     * 删除历史对话记录
     */
    async deleteHistory(historyId: number, userId: number) {
        try {
            console.log('[Chat Delete] 开始删除历史记录:', historyId, userId);
            
            // 先检查该记录是否属于当前用户
            const record = await this.taskRecordsService.getTaskRecordById(historyId);
            if (!record) {
                console.log('[Chat Delete] 历史记录不存在:', historyId);
                return {
                    success: false,
                    message: '历史记录不存在'
                };
            }

            if (record.historyUserId !== userId) {
                console.log('[Chat Delete] 无权删除该历史记录:', historyId, userId);
                return {
                    success: false,
                    message: '无权删除该历史记录'
                };
            }

            // 删除记录
            await this.taskRecordsService.deleteTaskRecord(String(historyId));
            console.log('[Chat Delete] 历史记录删除成功:', historyId);
            
            // 清除内存中的聊天历史
            this.chatHistories.delete(historyId);
            
            return {
                success: true,
                message: '历史记录删除成功'
            };
        } catch (error) {
            console.error('[Chat Delete] 删除历史记录失败:', error);
            return {
                success: false,
                message: '删除历史记录失败',
                error: error.message
            };
        }
    }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CozeAPI, ChatEventType, RoleType, COZE_CN_BASE_URL, EnterMessage } from '@coze/api';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { CozeAuthService } from './coze-auth.service';

@Injectable()
export class CozeService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CozeService.name);
    private chatHistories: Map<number, {
        messages: Array<{ role: string; content: string; timestamp?: number }>;
        startTime: number;
        endTime?: number;
        currentAssistantMessage?: string;
    }> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly cozeAuthService: CozeAuthService
    ) {}

    onModuleInit() {
        // 每5分钟清理一次过期的token
        this.cleanupInterval = setInterval(() => {
            this.cozeAuthService.cleanupExpiredTokens();
        }, 5 * 60 * 1000);
    }

    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }

    // 初始化或获取对话历史
    private async initOrGetChatHistory(
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number
    ): Promise<{ historyId: number; isNew: boolean }> {
        if (!historyId) {
            const newHistory: Partial<HistoryInfo> = {
                historyUserId: user.userId,
                historyAppId: 8,  // Coze应用的historyAppId是8
                historyStatus: 'processing',
                historyStartTime: new Date(),
                historyUseTime: 0,
                historyUsePoints: 0,
                historyResult: [],
                historyErrorInfos: []
            };
            this.logger.log('创建新的历史记录:', newHistory);
            const result = await this.taskRecordsService.writeTaskRecord(newHistory);
            this.logger.log('写入新历史记录结果:', result);
            historyId = result.historyId;
        }

        if (!this.chatHistories.has(historyId)) {
            this.logger.log('初始化内存中的聊天历史, historyId:', historyId);
            this.chatHistories.set(historyId, {
                messages: [],
                startTime: Date.now(),
                currentAssistantMessage: ''
            });
        }

        return { historyId, isNew: !this.chatHistories.has(historyId) };
    }

    // 更新对话历史记录
    private async updateChatHistory(historyId: number, message: { role: string; content: string }) {
        this.logger.log('准备更新对话历史, historyId:', historyId);
        this.logger.log('新消息:', message);
        
        const history = this.chatHistories.get(historyId);
        if (history) {
            history.messages.push({ ...message, timestamp: Date.now() });
            this.logger.log('当前内存中的所有消息:', history.messages);
            
            const updateData = {
                historyId,
                historyStatus: 'completed',
                historyUseTime: Date.now() - history.startTime,
                historyResult: history.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp
                }))
            };
            this.logger.log('准备更新到数据库的数据:', updateData);
            await this.taskRecordsService.updateTaskRecord(updateData);
        } else {
            this.logger.warn('警告: 未找到对应的历史记录, historyId:', historyId);
        }
    }

    // 完成对话
    async completeChatHistory(historyId: number) {
        this.logger.log('准备完成对话, historyId:', historyId);
        const history = this.chatHistories.get(historyId);
        if (history) {
            history.endTime = Date.now();
            
            // 如果有未保存的助手回复，先保存
            if (history.currentAssistantMessage) {
                history.messages.push({
                    role: 'assistant',
                    content: history.currentAssistantMessage,
                    timestamp: Date.now()
                });
                history.currentAssistantMessage = '';
            }
            
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
            this.logger.log('保存最终对话数据:', finalData);
            await this.taskRecordsService.updateTaskRecord(finalData);
            
            this.chatHistories.delete(historyId);
            this.logger.log('已清理内存中的对话历史');
        } else {
            this.logger.warn('警告: 完成对话时未找到历史记录, historyId:', historyId);
        }
    }

    async streamChat(params: {
        bot_id: string;
        message: string;
        additional_messages?: EnterMessage[];
        user?: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        };
        historyId?: number;
    }) {
        let finalHistoryId: number | undefined = params.historyId;
        
        try {
            // 获取access token
            const accessToken = await this.cozeAuthService.getAccessToken(params.user?.userId || 0);

            console.log('user', params.user);
            
            // 创建CozeAPI实例
            const cozeClient = new CozeAPI({
                baseURL: COZE_CN_BASE_URL,
                token: accessToken,
            });

            // 初始化或获取历史记录
            if (params.user) {
                const { historyId } = await this.initOrGetChatHistory(params.user, params.historyId);
                finalHistoryId = historyId;

                // 记录用户消息
                await this.updateChatHistory(finalHistoryId, {
                    role: 'user',
                    content: params.message
                });
            }

            const stream = await cozeClient.chat.stream({
                bot_id: params.bot_id,
                user_id: params.user?.userId.toString(),
                additional_messages: [
                    ...(params.additional_messages || []),
                    {
                        role: RoleType.User,
                        content: params.message,
                        content_type: 'text',
                    }
                ],
            });

            // 如果需要记录历史，包装stream以收集完整回复
            if (finalHistoryId) {
                const history = this.chatHistories.get(finalHistoryId);
                if (history) {
                    history.currentAssistantMessage = '';
                }

                const self = this; // 保存this引用
                const currentHistoryId = finalHistoryId; // 保存historyId的值

                return {
                    stream: {
                        [Symbol.asyncIterator]: async function* () {
                            try {
                                for await (const chunk of stream) {
                                    if (history && chunk.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
                                        const content = chunk.data?.content;
                                        if (content) {
                                            history.currentAssistantMessage += content;
                                        }
                                    } else if (chunk.event === ChatEventType.CONVERSATION_CHAT_COMPLETED) {
                                        // 对话完成时，保存助手回复
                                        if (history && history.currentAssistantMessage) {
                                            await self.updateChatHistory(currentHistoryId, {
                                                role: 'assistant',
                                                content: history.currentAssistantMessage
                                            });
                                            history.currentAssistantMessage = '';
                                        }
                                        // 确保在对话完成时调用completeChatHistory
                                        await self.completeChatHistory(currentHistoryId);
                                    }
                                    yield chunk;
                                }
                            } catch (error) {
                                self.logger.error('Stream processing error:', error);
                                throw error;
                            }
                        }
                    },
                    historyId: currentHistoryId
                };
            }

            return { stream, historyId: finalHistoryId };
        } catch (error) {
            this.logger.error('Stream chat error:', error);
            if (finalHistoryId) {
                await this.completeChatHistory(finalHistoryId);
            }
            throw error;
        }
    }

    // 删除历史记录
    async deleteHistory(historyId: number, userId: number) {
        try {
            this.logger.log('开始删除历史记录:', historyId, userId);
            
            const record = await this.taskRecordsService.getTaskRecordById(historyId);
            if (!record) {
                this.logger.log('历史记录不存在:', historyId);
                return {
                    isSuccess: false,
                    message: '历史记录不存在',
                    data: {}
                };
            }

            if (record.historyUserId !== userId) {
                this.logger.log('无权删除该历史记录:', historyId, userId);
                return {
                    isSuccess: false,
                    message: '无权删除该历史记录',
                    data: {}
                };
            }

            await this.taskRecordsService.deleteTaskRecord(String(historyId));
            this.logger.log('历史记录删除成功:', historyId);
            
            this.chatHistories.delete(historyId);
            
            return {
                isSuccess: true,
                message: '历史记录删除成功',
                data: {}
            };
        } catch (error) {
            this.logger.error('删除历史记录失败:', error);
            return {
                isSuccess: false,
                message: '删除历史记录失败，原因：' + error.message,
                data: {}
            };
        }
    }
}

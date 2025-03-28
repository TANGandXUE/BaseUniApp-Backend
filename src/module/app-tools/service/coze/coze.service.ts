import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CozeAPI, ChatEventType, RoleType, COZE_CN_BASE_URL, COZE_COM_BASE_URL, EnterMessage } from '@coze/api';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { CozeAuthService, CozeApiType } from './coze-auth.service';
import { DEFAULT_COZE_BOT_ID_CN, DEFAULT_COZE_BOT_ID_COM } from '../../config/coze.constants';
import axios from 'axios';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from '../../../apps/service/app-list/app-list.service';

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
    // 缓存机器人来源信息
    private botSourceCache: Map<string, CozeApiType> = new Map();
    // 默认每次对话消耗的点数
    private readonly POINTS_PER_CHAT = 1;

    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly cozeAuthService: CozeAuthService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService
    ) { }

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

    /**
     * 检测bot_id属于哪个API来源
     * @param bot_id 机器人ID
     * @returns API类型
     */
    private async getBotApiType(bot_id: string): Promise<CozeApiType> {
        console.log('0');
        // 如果在缓存中，直接返回
        if (this.botSourceCache.has(bot_id)) {
            return this.botSourceCache.get(bot_id);
        }
        console.log('1');

        // 对于默认bot_id，直接返回对应类型
        if (bot_id === DEFAULT_COZE_BOT_ID_CN) {
            this.botSourceCache.set(bot_id, CozeApiType.CN);
            return CozeApiType.CN;
        }
        if (bot_id === DEFAULT_COZE_BOT_ID_COM) {
            this.botSourceCache.set(bot_id, CozeApiType.COM);
            return CozeApiType.COM;
        }
        console.log('2');
        try {
            // 尝试获取CN的bots列表
            const cnBots = await this.getBotsFromSource(CozeApiType.CN);
            const foundInCN = cnBots.some(bot => bot.bot_id === bot_id);
            if (foundInCN) {
                this.botSourceCache.set(bot_id, CozeApiType.CN);
                return CozeApiType.CN;
            }

            console.log('CozeApiType.COM', CozeApiType.COM);
            // 尝试获取COM的bots列表
            const comBots = await this.getBotsFromSource(CozeApiType.COM);
            console.log('comBots', comBots);
            const foundInCOM = comBots.some(bot => bot.bot_id === bot_id);
            if (foundInCOM) {
                this.botSourceCache.set(bot_id, CozeApiType.COM);
                return CozeApiType.COM;
            }

            console.log('CozeApiType.CN', CozeApiType.CN);
            this.logger.log('33333333333333333');
            // 如果两个来源都没找到，默认使用CN
            this.logger.warn(`无法确定bot_id ${bot_id}的来源，默认使用CN`);
            this.botSourceCache.set(bot_id, CozeApiType.CN);
            return CozeApiType.CN;
        } catch (error) {
            this.logger.error(`确定bot_id来源时出错:`, error);
            // 出错时默认使用CN
            return CozeApiType.CN;
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
        // 如果提供了historyId，先检查它是否存在
        if (historyId) {
            try {
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                if (!existingRecord) {
                    this.logger.warn(`提供的historyId ${historyId} 在数据库中不存在，将创建新的历史记录`);
                    historyId = undefined; // 重置historyId，让下面的代码创建新记录
                } else if (existingRecord.historyUserId !== user.userId) {
                    this.logger.warn(`提供的historyId ${historyId} 不属于当前用户，将创建新的历史记录`);
                    historyId = undefined; // 重置historyId，让下面的代码创建新记录
                } else {
                    this.logger.log(`找到有效的历史记录，historyId: ${historyId}`);
                }
            } catch (error) {
                this.logger.error(`检查historyId ${historyId} 时出错:`, error);
                historyId = undefined; // 出错时创建新记录
            }
        }

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
            
            // 从数据库加载现有对话历史
            let existingMessages = [];
            try {
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                if (existingRecord && existingRecord.historyResult && Array.isArray(existingRecord.historyResult)) {
                    existingMessages = existingRecord.historyResult.map(msg => ({
                        role: (msg as any).role,
                        content: (msg as any).content,
                        timestamp: (msg as any).timestamp
                    }));
                    this.logger.log('从数据库加载了现有对话历史:', existingMessages);
                }
            } catch (error) {
                this.logger.error('加载现有对话历史失败:', error);
            }
            
            this.chatHistories.set(historyId, {
                messages: existingMessages,
                startTime: Date.now(),
                currentAssistantMessage: ''
            });
        }

        return { historyId, isNew: !this.chatHistories.has(historyId) };
    }

    // 更新对话历史记录并计费
    private async updateChatHistory(historyId: number, message: { role: string; content: string }) {
        this.logger.log(`准备更新对话历史, historyId: ${historyId}`);
        this.logger.log('新消息:', message);

        const history = this.chatHistories.get(historyId);
        if (history) {
            // 添加新消息到内存中的历史记录
            history.messages.push({ ...message, timestamp: Date.now() });
            this.logger.log(`当前内存中的消息数量: ${history.messages.length}`);

            // 先获取数据库中的现有记录
            const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
            if (!existingRecord) {
                this.logger.warn(`警告: 数据库中未找到对应的历史记录, historyId: ${historyId}`);
                return;
            }

            // 确保historyResult是数组
            let existingMessages = [];
            try {
                if (existingRecord.historyResult && Array.isArray(existingRecord.historyResult)) {
                    existingMessages = existingRecord.historyResult;
                    this.logger.log(`数据库中现有消息数量: ${existingMessages.length}`);
                }
            } catch (error) {
                this.logger.error('解析现有消息失败:', error);
            }

            // 将新消息添加到现有消息列表中
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
            
            this.logger.log(`准备更新到数据库的数据, 消息数量: ${updateData.historyResult.length}`);
            await this.taskRecordsService.updateTaskRecord(updateData);
            this.logger.log(`历史记录更新成功, historyId: ${historyId}`);

            // 如果是助手消息（模型回复），则需要计费
            if (message.role === 'assistant') {
                await this.deductPointsForChat(historyId, existingRecord.historyUserId);
            }
        } else {
            this.logger.warn(`警告: 内存中未找到对应的历史记录, historyId: ${historyId}`);
        }
    }

    // 扣除用户点数
    private async deductPointsForChat(historyId: number, userId: number) {
        try {
            // 获取用户信息
            const userInfo = await this.sqlService.getUserInfos(userId);
            if (!userInfo || !userInfo.isSuccess || !userInfo.data) {
                this.logger.warn(`未找到用户信息，无法扣除点数，用户ID: ${userId}`);
                return;
            }

            // 获取应用计费配置
            const appList = await this.appListService.getPublicAppList();
            const appId = 8; // Coze应用的historyAppId是8
            const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
            const pointsToDeduct = appCostConfig?.generateText?.cost || this.POINTS_PER_CHAT || 20;

            // 记录日志
            this.logger.log(`[Coze对话${historyId}] 开始扣除用户点数:`, {
                userId,
                pointsToDeduct,
                appId
            });

            // 扣除点数
            const user = {
                userId,
                userPhone: userInfo.data.userPhone,
                userEmail: userInfo.data.userEmail,
                userPoints: userInfo.data.userPoints
            };
            const deductResult = await this.sqlService.deductPointsWithCheck(user, pointsToDeduct);
            this.logger.log(`[Coze对话${historyId}] 扣除点数结果:`, deductResult);
        } catch (error) {
            this.logger.error(`扣除用户点数失败:`, error);
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

            // 先获取数据库中的现有记录
            const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
            if (!existingRecord) {
                this.logger.warn('警告: 数据库中未找到对应的历史记录, historyId:', historyId);
                return;
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
        this.logger.log(`streamChat 开始处理, 传入的 historyId: ${params.historyId || '无'}`);

        try {
            // 检查用户点数是否足够
            if (params.user) {
                // 获取应用计费配置
                const appList = await this.appListService.getPublicAppList();
                const appId = 8; // Coze应用的historyAppId是8
                const appCostConfig = appList.data.find(app => app.AppId === appId)?.AppCostConfig;
                const pointsToDeduct = appCostConfig?.generateText?.cost || this.POINTS_PER_CHAT || 20;
                
                // 检查点数是否足够
                const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(
                    params.user.userId,
                    pointsToDeduct
                );
                
                if (!isPointsEnough.isSuccess) {
                    this.logger.warn(`用户${params.user.userId}点数不足，需要${pointsToDeduct}点，当前可用点数：${isPointsEnough.data}`);
                    // 直接抛出错误，让上层的错误处理机制处理
                    throw new Error('余额不足');
                }
            }

            // 确定bot来源并获取正确的API类型
            const apiType = await this.getBotApiType(params.bot_id);
            this.logger.log(`确定bot_id ${params.bot_id}的API类型为: ${apiType}`);

            // 获取access token
            const accessToken = await this.cozeAuthService.getAccessToken(params.user?.userId || 0, apiType);

            console.log('accessToken', accessToken);

            // 获取正确的baseURL
            const baseURL = apiType === CozeApiType.CN ? COZE_CN_BASE_URL : COZE_COM_BASE_URL;
            this.logger.log(`使用API端点: ${baseURL}`);

            // 创建CozeAPI实例
            const cozeClient = new CozeAPI({
                baseURL,
                token: accessToken,
            });

            // 初始化或获取历史记录
            if (params.user) {
                this.logger.log(`开始处理对话历史, 用户ID: ${params.user.userId}, 请求的historyId: ${params.historyId || '无'}`);
                const { historyId, isNew } = await this.initOrGetChatHistory(params.user, params.historyId);
                finalHistoryId = historyId;
                this.logger.log(`最终使用的historyId: ${finalHistoryId}, 是否新建: ${isNew}`);

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
                                    // 检查是否为answer类型且内容中包含card_type的消息，如果是则跳过
                                    if (chunk.data && 
                                        typeof chunk.data === 'object' &&
                                        (chunk.event === 'conversation.message.completed' || chunk.event === 'conversation.message.delta') && 
                                        (chunk.data as any).type === 'answer' &&
                                        (chunk.data as any).content &&
                                        typeof (chunk.data as any).content === 'string' &&
                                        (chunk.data as any).content.includes('card_type')) {
                                        self.logger.log('过滤掉answer类型且包含card_type的消息:', {
                                            id: (chunk.data as any).id,
                                            event: chunk.event,
                                            type: (chunk.data as any).type,
                                            content_type: (chunk.data as any).content_type,
                                            content_preview: ((chunk.data as any).content as string).substring(0, 100) + '...'
                                        });
                                        continue; // 跳过此消息，不发送给前端
                                    }
                                    
                                    // 记录发送给前端的数据
                                    const chunkEvent = chunk.event || '未知事件';
                                    self.logger.log(`回传WebSocket数据 [${chunkEvent}]:`, JSON.stringify(chunk).substring(0, 500) + (JSON.stringify(chunk).length > 500 ? '...' : ''));
                                    
                                    if (history && chunk.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
                                        const content = typeof chunk.data === 'object' ? (chunk.data as any)?.content : undefined;
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
                                            // 此处调用updateChatHistory已经会处理计费逻辑，不需要额外调用
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

            // 确保record是HistoryInfo类型
            const historyRecord = record as any;
            if (historyRecord.historyUserId !== userId) {
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

    // 从特定来源获取bots列表
    private async getBotsFromSource(apiType: CozeApiType): Promise<any[]> {
        try {
            this.logger.log(`开始从${apiType}获取智能体列表`);
            
            // 获取access token，使用0作为userId，表示系统级操作
            const accessToken = await this.cozeAuthService.getAccessToken(0, apiType);
            
            // 从环境变量获取space_id
            const spaceIdEnvVar = apiType === CozeApiType.CN ? 'COZE_SPACE_ID_CN' : 'COZE_SPACE_ID_COM';
            const spaceId = process.env[spaceIdEnvVar];
            // console.log('spaceId', spaceId);
            
            if (!spaceId) {
                this.logger.warn(`未配置${spaceIdEnvVar}环境变量`);
                return [];
            }
            
            // 获取正确的baseURL
            const baseURL = apiType === CozeApiType.CN ? COZE_CN_BASE_URL : COZE_COM_BASE_URL;
            
            // 调用Coze API获取智能体列表
            const response = await axios.get(`${baseURL}/v1/space/published_bots_list`, {
                params: {
                    space_id: spaceId
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            // console.log('response', response.data);
            if (response.data && response.data.data) {
                const botsList = response.data.data.space_bots || [];
                
                // 给每个bot添加来源标记
                const botsWithSource = botsList.map(bot => ({
                    ...bot,
                    source: apiType // 添加来源标记
                }));
                
                this.logger.log(`从${apiType}获取了${botsWithSource.length}个智能体`);
                
                // 更新缓存
                botsWithSource.forEach(bot => {
                    this.botSourceCache.set(bot.id, apiType);
                });
                
                return botsWithSource;
            }
            
            return [];
        } catch (error) {
            this.logger.error(`从${apiType}获取智能体列表失败:`, error);
            return [];
        }
    }

    // 获取所有智能体列表
    async getBotsList() {
        try {
            this.logger.log('开始获取所有智能体列表');
            
            // 获取CN和COM的机器人列表
            const comBots = await this.getBotsFromSource(CozeApiType.COM);
            const cnBots = await this.getBotsFromSource(CozeApiType.CN);
            
            // 合并结果
            const allBots = [...cnBots, ...comBots];
            
            this.logger.log(`获取智能体列表成功，共${allBots.length}个智能体`);
            
            return {
                isSuccess: true,
                message: '获取智能体列表成功',
                data: {
                    data: {
                        space_bots: allBots
                    }
                }
            };
        } catch (error) {
            this.logger.error('获取智能体列表失败:', error);
            return {
                isSuccess: false,
                message: '获取智能体列表失败，原因：' + error.message,
                data: null
            };
        }
    }

    // 在连接断开时处理对话并根据需要计费
    async handleDisconnect(historyId: number) {
        const history = this.chatHistories.get(historyId);
        if (!history) {
            this.logger.warn(`处理断开连接: 历史记录不存在, historyId: ${historyId}`);
            return;
        }

        try {
            // 如果模型已经有回复内容，则进行计费
            if (history.currentAssistantMessage && history.currentAssistantMessage.trim().length > 0) {
                this.logger.log(`连接断开时模型已有回复内容(${history.currentAssistantMessage.length}字符), 进行计费`);
                
                // 获取数据库中的记录以获取用户ID
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                if (existingRecord) {
                    // 保存当前的回复内容到历史记录
                    history.messages.push({
                        role: 'assistant',
                        content: history.currentAssistantMessage,
                        timestamp: Date.now()
                    });
                    
                    // 执行扣费
                    await this.deductPointsForChat(historyId, existingRecord.historyUserId);
                }
            } else {
                this.logger.log(`连接断开时模型无回复内容，不计费`);
            }
            
            // 调用完成对话方法
            await this.completeChatHistory(historyId);
        } catch (error) {
            this.logger.error(`处理断开连接时出错:`, error);
            // 即使出错，也尝试完成对话
            try {
                await this.completeChatHistory(historyId);
            } catch (e) {
                this.logger.error(`完成对话失败:`, e);
            }
        }
    }
}

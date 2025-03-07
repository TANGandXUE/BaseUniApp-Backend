import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CozeService } from '../../../service/coze/coze.service';
import { ChatEventType, RoleType, EnterMessage } from '@coze/api';
import { ApiService } from '../../../service/chat/api/api.service';
import { ApiKey } from '../../../../../entities/apps/chat/apiKey.entity';

interface OpenAIMessage {
    role: string;
    content: string;
}

interface OpenAIChatRequest {
    model: string;
    messages: OpenAIMessage[];
    stream: boolean;
    temperature?: number;
    max_tokens?: number;
}

@Injectable()
export class ApiChatService {
    private readonly logger = new Logger(ApiChatService.name);
    private defaultUser = {
        userId: 1,
        userPhone: '',
        userEmail: '',
        userPoints: 0
    };

    constructor(
        private readonly cozeService: CozeService,
        private readonly apiService: ApiService
    ) { }

    /**
     * 将OpenAI格式聊天请求适配到Coze的聊天API
     */
    async chatCompletion(body: OpenAIChatRequest, response: any, apiKeyInfo: ApiKey) {
        try {
            this.logger.log(`接收到OpenAI格式聊天请求: ${JSON.stringify(body).substring(0, 500)}`);
            
            if (!body.stream) {
                throw new Error('目前仅支持流式响应，请设置stream=true');
            }

            // 设置SSE响应头
            response.setHeader('Content-Type', 'text/event-stream');
            response.setHeader('Cache-Control', 'no-cache');
            response.setHeader('Connection', 'keep-alive');
            response.flushHeaders();

            // 获取最后一条用户消息
            const userMessages = body.messages.filter(msg => msg.role.toLowerCase() === 'user');
            if (userMessages.length === 0) {
                throw new Error('请提供至少一条用户消息');
            }
            
            const lastUserMessage = userMessages[userMessages.length - 1].content;
            
            // 将系统消息转换为Coze的附加消息
            const additionalMessages = body.messages
                .filter(msg => msg.role.toLowerCase() !== 'user')
                .map(msg => ({
                    role: msg.role.toLowerCase() === 'system' ? RoleType.User : RoleType.Assistant,
                    content: msg.content,
                    content_type: 'text' as any
                })) as EnterMessage[];

            // 生成随机会话ID，用于OpenAI响应格式
            const chatId = `chatcmpl-${uuidv4().substring(0, 8)}`;
            const createdTimestamp = Math.floor(Date.now() / 1000);
            const modelId = apiKeyInfo.apiKeyModelId; // 使用API密钥中的模型ID
            const fingerprint = `fp_${uuidv4().substring(0, 8)}`;

            // 发送初始响应
            const initialResponse = {
                id: chatId,
                object: 'chat.completion.chunk',
                created: createdTimestamp,
                model: body.model || modelId, // 返回用户请求中的模型名称或API密钥的模型ID
                system_fingerprint: fingerprint,
                choices: [{
                    index: 0,
                    delta: { role: 'assistant', content: '' },
                    logprobs: null,
                    finish_reason: null
                }]
            };
            
            response.write(`data: ${JSON.stringify(initialResponse)}\n\n`);

            // 调用Coze服务的流式聊天API
            const { stream } = await this.cozeService.streamChat({
                bot_id: modelId, // 使用API密钥中的模型ID
                message: lastUserMessage,
                additional_messages: additionalMessages,
                user: this.defaultUser
            });

            let hasCompleted = false;

            // 处理Coze返回的流式响应，并转换为OpenAI格式
            for await (const chunk of stream) {
                if (chunk.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
                    // 从Coze的delta消息中提取内容
                    const content = typeof chunk.data === 'object' ? (chunk.data as any)?.content : '';
                    if (content) {
                        const deltaResponse = {
                            id: chatId,
                            object: 'chat.completion.chunk',
                            created: createdTimestamp,
                            model: body.model || modelId, // 返回用户请求中的模型名称或API密钥的模型ID
                            system_fingerprint: fingerprint,
                            choices: [{
                                index: 0,
                                delta: { content },
                                logprobs: null,
                                finish_reason: null
                            }]
                        };
                        
                        response.write(`data: ${JSON.stringify(deltaResponse)}\n\n`);
                    }
                } else if (chunk.event === ChatEventType.CONVERSATION_CHAT_COMPLETED) {
                    // 发送完成响应
                    const completeResponse = {
                        id: chatId,
                        object: 'chat.completion.chunk',
                        created: createdTimestamp,
                        model: body.model || modelId, // 返回用户请求中的模型名称或API密钥的模型ID
                        system_fingerprint: fingerprint,
                        choices: [{
                            index: 0,
                            delta: {},
                            logprobs: null,
                            finish_reason: 'stop'
                        }]
                    };
                    
                    response.write(`data: ${JSON.stringify(completeResponse)}\n\n`);
                    response.write('data: [DONE]\n\n');
                    
                    // 更新API密钥使用统计
                    await this.apiService.updateApiKeyUsageStats(apiKeyInfo.apiKeyId);
                    hasCompleted = true;
                    
                    response.end();
                } else if (chunk.event === ChatEventType.ERROR) {
                    this.logger.error('Coze API错误:', chunk.data);
                    const errorMessage = {
                        id: chatId,
                        object: 'chat.completion.chunk',
                        created: createdTimestamp,
                        model: body.model || modelId, // 返回用户请求中的模型名称或API密钥的模型ID
                        system_fingerprint: fingerprint,
                        choices: [{
                            index: 0,
                            delta: { content: '发生错误，请稍后重试。' },
                            logprobs: null,
                            finish_reason: 'error'
                        }]
                    };
                    
                    response.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
                    response.write('data: [DONE]\n\n');
                    
                    // 即使出错也更新API密钥使用统计
                    await this.apiService.updateApiKeyUsageStats(apiKeyInfo.apiKeyId);
                    hasCompleted = true;
                    
                    response.end();
                }
            }

            // 确保在所有情况下都更新API密钥使用统计
            if (!hasCompleted) {
                await this.apiService.updateApiKeyUsageStats(apiKeyInfo.apiKeyId);
                if (!response.writableEnded) {
                    response.end();
                }
            }
        } catch (error) {
            this.logger.error('OpenAI到Coze聊天适配错误:', error);
            
            // 即使出错也尝试更新API密钥使用统计
            if (apiKeyInfo) {
                await this.apiService.updateApiKeyUsageStats(apiKeyInfo.apiKeyId);
            }
            
            const errorMessage = JSON.stringify({ 
                error: { 
                    message: error.message || '处理请求时发生错误', 
                    type: 'api_error' 
                } 
            });
            
            if (!response.headersSent) {
                response.setHeader('Content-Type', 'application/json');
                response.status(500).send(errorMessage);
            } else if (!response.writableEnded) {
                response.write(`data: ${errorMessage}\n\n`);
                response.write('data: [DONE]\n\n');
                response.end();
            }
        }
    }
}

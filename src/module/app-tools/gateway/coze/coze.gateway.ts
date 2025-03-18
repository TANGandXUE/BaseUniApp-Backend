import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import * as WebSocket from 'ws';
import { CozeService } from '../../service/coze/coze.service';
import { Logger } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { jwtConstants } from '../../../user/others/jwtconstants';
import { parse } from 'url';

@WebSocketGateway({
    path: '/app-tools/coze',
})
export class CozeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: WebSocket.Server;
    private readonly logger = new Logger(CozeGateway.name);
    private clientHistories: Map<WebSocket, { 
        historyId?: number;
        botIdCache?: string; // 缓存当前对话使用的bot_id
    }> = new Map();

    constructor(private readonly cozeService: CozeService) { }

    private extractToken(url: string): string | null {
        const { query } = parse(url, true);
        return (query?.token as string) || null;
    }

    private validateToken(token: string): any {
        try {
            return verify(token, jwtConstants.secret);
        } catch (error) {
            this.logger.error('Token validation failed:', error);
            return null;
        }
    }

    handleConnection(client: WebSocket, request: any) {
        const clientId = Math.random().toString(36).substring(7);
        (client as any).clientId = clientId;
        this.logger.log(`客户端 [${clientId}] 尝试连接, IP: ${request.socket.remoteAddress}`);

        // 从URL参数中获取token
        const token = this.extractToken(request.url);
        if (!token) {
            this.logger.error(`客户端 [${clientId}] 未提供token`);
            client.close(1008, 'No authentication token provided');
            return;
        }

        // 验证token
        const user = this.validateToken(token);
        if (!user) {
            this.logger.error(`客户端 [${clientId}] token无效`);
            client.close(1008, 'Invalid authentication token');
            return;
        }

        // 将用户信息存储在client对象中
        (client as any).user = user;
        // 初始化客户端历史记录状态
        this.clientHistories.set(client, {});
        
        this.logger.log(`客户端 [${clientId}] 已连接成功，用户ID: ${user.userId}`);

        // 添加心跳检测
        const pingInterval = setInterval(() => {
            if (client.readyState === WebSocket.OPEN) {
                this.logger.debug(`向客户端 [${clientId}] 发送ping`);
                client.ping();
            } else {
                this.logger.warn(`客户端 [${clientId}] 连接状态异常: ${client.readyState}，清除ping间隔`);
                clearInterval(pingInterval);
            }
        }, 30000); // 每30秒ping一次

        // 监听pong响应
        client.on('pong', () => {
            this.logger.debug(`收到客户端 [${clientId}] 的pong响应`);
        });

        client.on('message', async (message: WebSocket.Data) => {
            try {
                const data = JSON.parse(message.toString());
                const { bot_id, message: userMessage, additional_messages, historyId: requestHistoryId } = data;
                const clientState = this.clientHistories.get(client);
                
                this.logger.log(`客户端 [${clientId}] 发送消息: bot_id=${bot_id}, 消息长度=${userMessage?.length || 0}, 历史ID=${requestHistoryId || '无'}`);
                this.logger.log(`收到WebSocket消息: bot_id=${bot_id}, 前端传递的historyId=${requestHistoryId}, 当前clientState.historyId=${clientState?.historyId}`);

                // 存储当前使用的bot_id
                if (bot_id) {
                    clientState.botIdCache = bot_id;
                }

                // 如果是新对话（没有historyId）或明确要求新对话
                if (data.newConversation) {
                    // 如果有旧的对话，先完成它
                    if (clientState?.historyId) {
                        await this.cozeService.completeChatHistory(clientState.historyId);
                    }
                    // 清除历史ID，让服务创建新的
                    clientState.historyId = undefined;
                    this.logger.log('新对话请求，已清除历史ID');
                } 
                // 如果前端传递了historyId，优先使用前端传递的
                else if (requestHistoryId && requestHistoryId > 0) {
                    clientState.historyId = requestHistoryId;
                    this.logger.log(`使用前端传递的historyId: ${requestHistoryId}`);
                }

                // 调用cozeService处理对话，传入用户信息和历史ID
                const result = await this.cozeService.streamChat({
                    bot_id,
                    message: userMessage,
                    additional_messages,
                    historyId: clientState?.historyId,
                    user: {
                        userId: user.userId,
                        userPhone: user.userPhone,
                        userEmail: user.userEmail,
                        userPoints: user.userPoints
                    }
                });

                // 保存新的historyId
                if (result.historyId) {
                    clientState.historyId = result.historyId;
                    this.logger.log(`更新clientState.historyId为: ${result.historyId}`);
                    
                    // 在开始处理流之前，先发送historyId给前端
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            event: 'conversation.history.id',
                            data: {
                                historyId: result.historyId
                            }
                        }));
                        this.logger.log(`已发送historyId给前端: ${result.historyId}`);
                    }
                }

                // 处理流式响应
                this.logger.log(`客户端 [${clientId}] 开始接收流式响应`);
                let messageCount = 0;
                const startTime = Date.now();
                
                try {
                    for await (const part of result.stream) {
                        messageCount++;
                        
                        if (client.readyState === WebSocket.OPEN) {
                            const data = JSON.stringify(part);
                            // 记录发送的数据，但限制长度以防日志过大
                            const shortData = data.length > 300 ? data.substring(0, 300) + '...' : data;
                            
                            if (messageCount % 10 === 0) {
                                // 每10条消息记录一次详细状态，避免日志过多
                                const elapsedTime = Date.now() - startTime;
                                this.logger.log(`客户端 [${clientId}] 已发送 ${messageCount} 条消息，耗时 ${elapsedTime}ms，连接状态: ${client.readyState}`);
                            }
                            
                            this.logger.log(`Gateway发送数据: ${shortData}`);
                            client.send(data);
                        } else {
                            this.logger.warn(`客户端 [${clientId}] 连接已关闭(状态:${client.readyState})，无法发送消息`);
                            break;
                        }
                    }
                    
                    const totalTime = Date.now() - startTime;
                    this.logger.log(`客户端 [${clientId}] 流式响应完成，共发送 ${messageCount} 条消息，总耗时 ${totalTime}ms`);
                } catch (error) {
                    this.logger.error(`客户端 [${clientId}] 处理流式响应时出错:`, error);
                }
            } catch (error) {
                this.logger.error(`客户端 [${clientId}] 处理消息时出错:`, error);
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: 'ERROR',
                        data: {
                            message: error.message || '处理消息时发生错误'
                        }
                    }));
                }
            }
        });

        // 存储pingInterval以便在断开连接时清除
        (client as any).pingInterval = pingInterval;
    }

    handleDisconnect(client: WebSocket) {
        const clientId = (client as any).clientId || '未知';
        const user = (client as any).user;
        this.logger.log(`客户端 [${clientId}] 断开连接，用户ID: ${user?.userId || '未知'}, 关闭代码: ${(client as any).closeCode || '未知'}, 关闭原因: ${(client as any).closeReason || '未知'}`);
        
        // 当客户端断开连接时，完成当前对话并清理状态
        const clientState = this.clientHistories.get(client);
        if (clientState?.historyId) {
            this.logger.log(`客户端 [${clientId}] 断开连接，尝试完成对话，historyId: ${clientState.historyId}`);
            this.cozeService.completeChatHistory(clientState.historyId)
                .then(() => this.logger.log(`客户端 [${clientId}] 的对话历史已成功完成，historyId: ${clientState.historyId}`))
                .catch(error => this.logger.error(`客户端 [${clientId}] 完成对话历史时出错:`, error));
        }

        // 清除心跳检测
        if ((client as any).pingInterval) {
            clearInterval((client as any).pingInterval);
            this.logger.log(`客户端 [${clientId}] 的ping间隔已清除`);
        }

        this.clientHistories.delete(client);
        this.logger.log(`客户端 [${clientId}] 的历史记录已从内存中清除`);
    }
} 
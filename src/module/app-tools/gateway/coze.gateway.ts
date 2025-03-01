import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import * as WebSocket from 'ws';
import { CozeService } from '../service/coze/coze.service';
import { Logger } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { jwtConstants } from '../../user/others/jwtconstants';
import { parse } from 'url';

@WebSocketGateway({
    path: '/app-tools/coze',
})
export class CozeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: WebSocket.Server;
    private readonly logger = new Logger(CozeGateway.name);
    private clientHistories: Map<WebSocket, { historyId?: number }> = new Map();

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
        this.logger.log('Client attempting to connect');

        // 从URL参数中获取token
        const token = this.extractToken(request.url);
        if (!token) {
            this.logger.error('No token provided');
            client.close(1008, 'No authentication token provided');
            return;
        }

        // 验证token
        const user = this.validateToken(token);
        if (!user) {
            this.logger.error('Invalid token');
            client.close(1008, 'Invalid authentication token');
            return;
        }

        // 将用户信息存储在client对象中
        (client as any).user = user;
        // 初始化客户端历史记录状态
        this.clientHistories.set(client, {});
        
        this.logger.log('Client connected with user:', user.userId);

        client.on('message', async (message: WebSocket.Data) => {
            try {
                const data = JSON.parse(message.toString());
                const { bot_id, message: userMessage, additional_messages, historyId: requestHistoryId } = data;
                const clientState = this.clientHistories.get(client);
                
                this.logger.log(`收到WebSocket消息: bot_id=${bot_id}, 前端传递的historyId=${requestHistoryId}, 当前clientState.historyId=${clientState?.historyId}`);

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
                for await (const part of result.stream) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(part));
                    }
                }
            } catch (error) {
                this.logger.error('Error processing message:', error);
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
    }

    handleDisconnect(client: WebSocket) {
        // 当客户端断开连接时，完成当前对话并清理状态
        const clientState = this.clientHistories.get(client);
        if (clientState?.historyId) {
            this.cozeService.completeChatHistory(clientState.historyId)
                .catch(error => this.logger.error('Error completing chat history:', error));
        }
        this.clientHistories.delete(client);
        this.logger.log('Client disconnected:', (client as any).user?.userId);
    }
} 
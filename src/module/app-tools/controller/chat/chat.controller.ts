import { Body, Controller, Post, Res, UseGuards, Req } from '@nestjs/common';
import { ChatService } from '../../service/chat/chat.service';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('stream')
    async streamChatMessages(
        @Res() res: Response,
        @Body('messages') messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
        @Body('historyId') historyId?: number,
        @Body('options') options?: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        },
        @Req() req?: any
    ) {
        console.log('streamChatMessages', messages, historyId, options);
        const abortController = new AbortController();

        // 监听客户端断开连接
        res.on('close', () => {
            abortController.abort();
        });

        try {
            const { stream, historyId: finalHistoryId } = await this.chatService.streamChatMessages(
                messages, 
                req.user,  // 传入用户信息
                historyId, 
                options, 
                abortController
            );

            // 设置响应头
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // 发送historyId
            res.write(`data: ${JSON.stringify({ historyId: finalHistoryId })}\n\n`);

            // 处理流式数据
            for await (const chunk of stream) {
                if (abortController.signal.aborted) {
                    break;
                }
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            res.end();
        } catch (error) {
            if (error.name === 'AbortError') {
                res.end();
                return;
            }
            res.json({
                success: false,
                message: '流式对话消息发送失败',
                error: error.message
            });
        }
    }

    @Post()
    async sendChatMessages(
        @Body('messages') messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
        @Body('historyId') historyId?: number,
        @Body('options') options?: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        },
        @Req() req?: any
    ) {
        return await this.chatService.sendChatMessages(messages, req.user, historyId, options);
    }

    @Post('end')
    async endChat(@Body('historyId') historyId: number) {
        return await this.chatService.endChat(historyId);
    }

    /**
     * 删除历史对话记录
     */
    @Post('delete')
    async deleteHistory(
        @Body('historyId') historyId: number,
        @Req() req: any
    ) {
        return await this.chatService.deleteHistory(historyId, req.user.userId);
    }
}

import { Controller, Post, Body, Res, Logger, HttpStatus, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ApiChatService } from '../../../service/chat/api-chat/api-chat.service';
import { ApiService } from '../../../service/chat/api/api.service';

@ApiTags('API Chat')
@Controller('app-tools/chat/api-chat')
export class ApiChatController {
    private readonly logger = new Logger(ApiChatController.name);

    constructor(
        private readonly apiChatService: ApiChatService,
        private readonly apiService: ApiService
    ) { }

    @Post('v1/chat/completions')
    @ApiOperation({ summary: 'OpenAI格式的聊天完成API' })
    @ApiHeader({
        name: 'Authorization',
        description: '格式为：Bearer YOUR_API_KEY',
        required: true
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['messages', 'stream'],
            properties: {
                model: {
                    type: 'string',
                    description: '模型ID，此参数将被忽略，系统会使用API密钥绑定的模型',
                    example: 'gpt-4o'
                },
                messages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                            content: { type: 'string' }
                        }
                    },
                    example: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: 'Hello!' }
                    ]
                },
                stream: { type: 'boolean', example: true },
                temperature: { type: 'number', example: 0.7 },
                max_tokens: { type: 'number', example: 2000 }
            }
        }
    })
    async chatCompletions(@Body() body: any, @Res() response: Response, @Req() request: Request) {
        try {
            if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
                return response.status(HttpStatus.BAD_REQUEST).json({
                    error: {
                        message: '请提供有效的消息数组',
                        type: 'invalid_request_error'
                    }
                });
            }

            // 从请求头中获取API密钥
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return response.status(HttpStatus.UNAUTHORIZED).json({
                    error: {
                        message: '缺少有效的API密钥',
                        type: 'authentication_error'
                    }
                });
            }

            const apiKey = authHeader.split(' ')[1];
            this.logger.log(`使用API密钥: ${apiKey.substring(0, 5)}***`);

            // 验证API密钥并获取相关信息
            const apiKeyInfo = await this.apiService.validateApiKey(apiKey);
            if (!apiKeyInfo) {
                this.logger.warn(`无效的API密钥: ${apiKey.substring(0, 5)}***`);
                return response.status(HttpStatus.UNAUTHORIZED).json({
                    error: {
                        message: 'API密钥无效',
                        type: 'authentication_error'
                    }
                });
            }

            // 检查API密钥是否已禁用
            if (!apiKeyInfo.apiKeyEnabled) {
                this.logger.warn(`API密钥已禁用: ${apiKey.substring(0, 5)}***`);
                return response.status(HttpStatus.FORBIDDEN).json({
                    error: {
                        message: 'API密钥已被禁用',
                        type: 'access_denied_error'
                    }
                });
            }

            // 检查API密钥是否已过期
            if (apiKeyInfo.apiKeyExpiresAt && new Date() > apiKeyInfo.apiKeyExpiresAt) {
                this.logger.warn(`API密钥已过期: ${apiKey.substring(0, 5)}***`);
                return response.status(HttpStatus.FORBIDDEN).json({
                    error: {
                        message: 'API密钥已过期',
                        type: 'access_denied_error'
                    }
                });
            }

            // 设置用于Coze请求的模型ID（使用API密钥绑定的模型ID）
            const modelId = apiKeyInfo.apiKeyModelId;
            this.logger.log(`使用模型ID: ${modelId}`);

            // 处理请求并更新API密钥使用统计
            return await this.apiChatService.chatCompletion(body, response, apiKeyInfo);

        } catch (error) {
            this.logger.error('处理聊天完成请求时出错:', error);
            if (!response.headersSent) {
                return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: {
                        message: error.message || '处理请求时发生错误',
                        type: 'api_error'
                    }
                });
            }
        }
    }
}

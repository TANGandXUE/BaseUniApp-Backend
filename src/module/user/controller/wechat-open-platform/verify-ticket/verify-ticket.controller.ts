import { Controller, Post, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { VerifyTicketService } from '../../../service/wechat-open-platform/verify-ticket/verify-ticket.service';

// 扩展 Request 类型
interface RequestWithRawBody extends Request {
    rawBody?: Buffer;
}

@Controller('user/wechat-open-platform/verify-ticket')
export class VerifyTicketController {
    constructor(private readonly verifyTicketService: VerifyTicketService) {}

    @Post()
    async handleTicket(
        @Req() request: RequestWithRawBody,
        @Query('timestamp') timestamp: string,
        @Query('nonce') nonce: string,
        @Query('msg_signature') msgSignature: string,
    ): Promise<string> {
        try {
            const body = request.rawBody?.toString() || '';
            console.log('收到的原始请求体:', body);
            
            await this.verifyTicketService.verifySignature(timestamp, nonce, msgSignature, body);
            await this.verifyTicketService.decryptTicket(body);

            return 'success';
        } catch (error) {
            console.error('处理 component_verify_ticket 失败:', error);
            throw error;
        }
    }

    @Get('latest')
    async getLatestTicket() {
        return await this.verifyTicketService.getLatestTicket();
    }
}

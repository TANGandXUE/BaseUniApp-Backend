import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CosyvoiceService } from '../../service/cosyvoice/cosyvoice.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/cosyvoice')
export class CosyvoiceController {
    constructor(
        private readonly cosyvoiceService: CosyvoiceService
    ) { }

    @Post('start')
    @UseGuards(JwtAuthGuard)
    async submitVoiceTask(@Req() req: any): Promise<any> {
        return await this.cosyvoiceService.submitVoiceTask(req.body, req.user);
    }

    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.cosyvoiceService.queryTaskStatus(req.body.taskId, req.user.userId);
    }
}

import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { CosyvoiceAliyunService } from '../../service/cosyvoice-aliyun/cosyvoice-aliyun.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { Public } from 'src/module/user/others/public.decorator';

@Controller('app-tools/cosyvoice-aliyun')
export class CosyvoiceAliyunController {
    constructor(private readonly cosyvoiceAliyunService: CosyvoiceAliyunService) { }

    // 提交语音合成任务
    @Post('start')
    @UseGuards(JwtAuthGuard)
    async executeTTS(@Req() req: any): Promise<any> {
        return await this.cosyvoiceAliyunService.executeTTS(req.body, req.user, 24); // 假设CosyVoice的 appId 是 24
    }

    // 批量提交语音合成任务
    @Post('batch-start')
    @UseGuards(JwtAuthGuard)
    async executeBatchTTS(@Req() req: any): Promise<any> {
        return await this.cosyvoiceAliyunService.executeBatchTTS(req.body, req.user, 24); // 假设CosyVoice的 appId 是 24
    }

    // 获取任务状态
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.cosyvoiceAliyunService.queryTaskStatus(req.body.taskId, req.user.userId);
    }

    // 获取语音列表（个人+公开）
    @Get('voice-list')
    @UseGuards(JwtAuthGuard)
    getVoiceList(@Req() req: any): any {
        return this.cosyvoiceAliyunService.getVoiceList(req.user.userId);
    }
    
    // 获取用户的个人音色列表
    @Get('user-voice-list')
    @UseGuards(JwtAuthGuard)
    getUserVoiceList(@Req() req: any): any {
        return this.cosyvoiceAliyunService.getUserVoices(req.user.userId);
    }
    
    // 公开的语音列表接口（不需要登录也可获取默认音色）
    @Get('public-voice-list')
    @Public()
    getPublicVoiceList(): any {
        return this.cosyvoiceAliyunService.getVoiceList();
    }
}
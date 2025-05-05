import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { SambertAliyunService } from '../../service/sambert-aliyun/sambert-aliyun.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { Public } from 'src/module/user/others/public.decorator';

@Controller('app-tools/sambert-aliyun')
export class SambertAliyunController {
    constructor(private readonly sambertAliyunService: SambertAliyunService) { }

    // 提交语音合成任务
    @Post('start')
    @UseGuards(JwtAuthGuard)
    async executeTTS(@Req() req: any): Promise<any> {
        return await this.sambertAliyunService.executeTTS(req.body, req.user, 25); // 假设Sambert的 appId 是 25
    }

    // 批量提交语音合成任务
    @Post('batch-start')
    @UseGuards(JwtAuthGuard)
    async executeBatchTTS(@Req() req: any): Promise<any> {
        return await this.sambertAliyunService.executeBatchTTS(req.body, req.user, 25); // 假设Sambert的 appId 是 25
    }

    // 获取任务状态
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.sambertAliyunService.queryTaskStatus(req.body.taskId, req.user.userId);
    }

    // 获取语音列表（仅公开音色）
    @Get('voice-list')
    @UseGuards(JwtAuthGuard)
    getVoiceList(): any {
        return this.sambertAliyunService.getVoiceList();
    }
    
    // 公开的语音列表接口（不需要登录也可获取默认音色）
    @Get('public-voice-list')
    @Public()
    getPublicVoiceList(): any {
        return this.sambertAliyunService.getVoiceList();
    }
}

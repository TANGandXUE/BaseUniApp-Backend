import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { LiveTextService, GenerateTextParams } from '../../service/live-text/live-text.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/live-text')
export class LiveTextController {
    constructor(
        private readonly liveTextService: LiveTextService
    ) { }

    // 文本润色
    @Post('polish')
    @UseGuards(JwtAuthGuard)
    async polishText(@Body() body: { text: string, prompt: string, historyId?: number }, @Req() req: any): Promise<any> {
        return await this.liveTextService.polishText(body.text, body.prompt, req.user, body.historyId);
    }

    // 去除违禁词
    @Post('clean')
    @UseGuards(JwtAuthGuard)
    async removeForbiddenWords(@Body() body: { text: string, prompt: string, historyId?: number }, @Req() req: any): Promise<any> {
        return await this.liveTextService.removeForbiddenWords(body.text, body.prompt, req.user, body.historyId);
    }

    // 检查违禁词
    @Post('check')
    @UseGuards(JwtAuthGuard)
    async checkForbiddenWords(@Body() body: { text: string }): Promise<any> {
        const { checkForbiddenWords } = require('../../service/live-text/live-text.service');
        const foundWords = checkForbiddenWords(body.text);
        return {
            isSuccess: true,
            message: foundWords.length > 0 ? `发现${foundWords.length}个违禁词` : '未发现违禁词',
            data: {
                foundForbiddenWords: foundWords
            }
        };
    }

    // 生成文本
    @Post('generate')
    @UseGuards(JwtAuthGuard)
    async generateText(@Body() params: GenerateTextParams & { historyId?: number }, @Req() req: any): Promise<any> {
        return await this.liveTextService.generateText(params, req.user, params.historyId);
    }

    // 获取历史记录
    @Post('history')
    @UseGuards(JwtAuthGuard)
    async getTaskHistory(@Body() body: { taskId: number }, @Req() req: any): Promise<any> {
        return await this.liveTextService.getTaskHistory(req.user.userId, body.taskId);
    }
}
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { CozeService } from '../../service/coze/coze.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/coze')
@UseGuards(JwtAuthGuard)
export class CozeController {
    constructor(private readonly cozeService: CozeService) {}

    /**
     * 删除历史对话记录
     */
    @Post('delete')
    @UseGuards(JwtAuthGuard)
    // 定义一个异步方法 deleteHistory，用于删除历史记录
    async deleteHistory(
        @Body('historyId') historyId: number,
        @Req() req: any
    ) {
        console.log('historyId', historyId);
        return await this.cozeService.deleteHistory(historyId, req.user.userId);
    }

    /**
     * 获取智能体列表
     */
    @Get('bots')
    async getBotsList() {
        return await this.cozeService.getBotsList();
    }
}

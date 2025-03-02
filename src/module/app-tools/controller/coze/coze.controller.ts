import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { CozeService } from '../../service/coze/coze.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { CozeAuthService } from '../../service/coze/coze-auth.service';

@Controller('app-tools/coze')
@UseGuards(JwtAuthGuard)
export class CozeController {
    constructor(
        private readonly cozeService: CozeService,
        private readonly cozeAuthService: CozeAuthService
    ) {}

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

    /**
     * 获取用户的OAuth鉴权密钥，用于前端直传文件
     */
    @Get('access-token')
    @UseGuards(JwtAuthGuard)
    async getAccessToken(@Req() req: any) {
        try {
            const userId = req.user.userId;
            const accessToken = await this.cozeAuthService.getAccessToken(userId);
            
            return {
                isSuccess: true,
                message: '获取OAuth鉴权密钥成功',
                data: {
                    accessToken
                }
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: '获取OAuth鉴权密钥失败，原因：' + error.message,
                data: null
            };
        }
    }
}

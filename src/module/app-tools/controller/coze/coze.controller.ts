import { Controller, Post, Body, UseGuards, Req, Get, Query } from '@nestjs/common';
import { CozeService } from '../../service/coze/coze.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { CozeAuthService, CozeApiType } from '../../service/coze/coze-auth.service';

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
     * 可以通过apiType查询参数指定获取哪个API的token
     */
    @Get('access-token')
    @UseGuards(JwtAuthGuard)
    async getAccessToken(
        @Req() req: any,
        @Query('apiType') apiTypeStr?: string
    ) {
        try {
            const userId = req.user.userId;
            // 如果提供了apiType，使用它，否则默认使用CN
            const apiType = apiTypeStr === 'com' ? CozeApiType.COM : CozeApiType.CN;
            const accessToken = await this.cozeAuthService.getAccessToken(userId, apiType);
            
            return {
                isSuccess: true,
                message: '获取OAuth鉴权密钥成功',
                data: {
                    accessToken,
                    apiType
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

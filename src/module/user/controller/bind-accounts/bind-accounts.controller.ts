import { Controller, Post, Get, UseGuards, Req, Body } from '@nestjs/common';
import { BindAccountsService } from '../../service/bind-accounts/bind-accounts.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('user/bind-accounts')
export class BindAccountsController {
    constructor(private readonly bindAccountsService: BindAccountsService) {}

    // 开始绑定流程
    @Post('wechat-official/start')
    @UseGuards(JwtAuthGuard)
    async startBinding(@Req() req: any) {
        return await this.bindAccountsService.startBinding(req.user.userId);
    }

    // 检查绑定状态
    @Post('wechat-official/check')
    @UseGuards(JwtAuthGuard)
    async checkBindingStatus(@Req() req: any) {
        return await this.bindAccountsService.checkBindingStatus(req.user.userId);
    }

    // 解除绑定
    @Post('wechat-official/unbind')
    @UseGuards(JwtAuthGuard)
    async unbind(@Req() req: any) {
        return await this.bindAccountsService.unbind(req.user.userId);
    }

    // 检查用户是否已绑定微信公众号且未过期
    @Get('wechat-official/check-valid')
    @UseGuards(JwtAuthGuard)
    async checkBindingValid(@Req() req: any) {
        return await this.bindAccountsService.checkBindingValid(req.user.userId);
    }
}

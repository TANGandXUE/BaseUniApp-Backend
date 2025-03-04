import { Controller, Get, Res, UseGuards, Req } from '@nestjs/common';
import { InviteService } from '../../service/invite/invite.service';
import { JwtAuthGuard } from '../../others/jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@Controller('user/invite')
@ApiTags('用户邀请相关')
export class InviteController {
    constructor(private readonly inviteService: InviteService) { }

    @Get('poster')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: '生成用户邀请海报' })
    async generateInvitePoster(@Req() req: any, @Res() res: Response) {
        try {
            // 从请求中获取用户邀请码
            const userInviteCode = req.user.userInviteCode;

            console.log("user: ", req.user);

            if (!userInviteCode) {
                return res.status(400).json({
                    isSuccess: false,
                    message: '用户邀请码不存在',
                    data: null
                });
            }

            // 生成海报
            const posterBuffer = await this.inviteService.generateInvitePoster(userInviteCode);

            // 设置响应头
            res.set({
                'Content-Type': 'image/png',
                'Content-Disposition': `inline; filename="invite-poster-${userInviteCode}.png"`
            });

            // 返回图片数据
            return res.send(posterBuffer);
        } catch (error) {
            console.error('生成邀请海报失败:', error);
            return res.status(500).json({
                isSuccess: false,
                message: '生成邀请海报失败: ' + error.message,
                data: null
            });
        }
    }
} 
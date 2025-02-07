import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UserAssetsService } from '../../service/user-assets/user-assets.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';


@Controller('sql/user-assets')
export class UserAssetsController {
    constructor(private readonly userAssetsService: UserAssetsService) { }

    // 获取用户资产
    @Get()
    @UseGuards(JwtAuthGuard)
    async getUserAssets(@Req() req: any) {
        return {
            isSuccess: true,
            message: '获取用户资产成功',
            data: await this.userAssetsService.getFullAssets(req.user.userId)
        }
    }


    // 获取积分
    @Get('points')
    @UseGuards(JwtAuthGuard)
    async getPoints(@Req() req: any) {
        return {
            isSuccess: true,
            message: '获取积分成功',
            data: await this.userAssetsService.getAvailablePoints(req.user.userId)
        }
    }


    // 获取会员等级(完整，未过期)
    @Get('membership')
    @UseGuards(JwtAuthGuard)

    async getMembershipLevels(@Req() req: any) {
        return {
            isSuccess: true,
            message: '获取会员等级成功（完整，未过期）',
            data: await this.userAssetsService.getMembershipLevels(req.user.userId)
        }
    }


    // 获取会员等级(仅当前等级)
    @Get('membership/current')
    @UseGuards(JwtAuthGuard)
    async getCurrentMembershipLevel(@Req() req: any) {
        return {
            isSuccess: true,
            message: '获取当前会员等级成功（仅当前等级）',
            data: await this.userAssetsService.getCurrentMembershipLevel(req.user.userId)
        }
    }


    // 获取高级功能
    @Get('premium-features')
    @UseGuards(JwtAuthGuard)

    async getPremiumFeatures(@Req() req: any) {
        return {
            isSuccess: true,
            message: '获取高级功能成功',
            data: await this.userAssetsService.getPremiumFeatures(req.user.userId)
        }
    }



}
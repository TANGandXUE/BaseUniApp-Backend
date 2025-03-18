import { Controller, Post, Get, UseGuards, Req, Query } from '@nestjs/common';
import { CheckInService } from '../../service/check-in/check-in.service';
import { JwtAuthGuard } from '../../others/jwt-auth.guard';

@Controller('user/check-in')
@UseGuards(JwtAuthGuard)
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    /**
     * 执行签到
     */
    @Post()
    async signIn(@Req() req: any) {
        try {
            const result = await this.checkInService.performSignIn(req.user.userId);
            return {
                isSuccess: true,
                message: '签到成功',
                data: result
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message,
                data: null
            };
        }
    }

    /**
     * 查询签到历史
     */
    @Get('history')
    async getSignInHistory(
        @Req() req: any,
        @Query('startDate') startDateStr: string,
        @Query('endDate') endDateStr: string
    ) {
        try {
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);

            const result = await this.checkInService.getSignInHistory(
                req.user.userId,
                startDate,
                endDate
            );

            return {
                isSuccess: true,
                message: '获取签到历史成功',
                data: result
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message,
                data: null
            };
        }
    }

    /**
     * 获取签到统计信息
     */
    @Get('stats')
    async getSignInStats(@Req() req: any) {
        try {
            const result = await this.checkInService.getSignInStats(req.user.userId);
            return {
                isSuccess: true,
                message: '获取签到统计成功',
                data: result
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message,
                data: null
            };
        }
    }
}
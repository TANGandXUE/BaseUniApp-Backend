// pay.controller.ts
import { Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common';
import { PayService } from '../../service/pay/pay.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { use } from 'passport';

@Controller('api/pay')
export class PayController {
    constructor(private readonly payService: PayService) { }

    @Post('start')
    @UseGuards(JwtAuthGuard)
    async startPayment(@Req() req): Promise<any> {
        console.log(req.body.payMethod);
        const responseData = await this.payService.startPayment(
            req.body.itemName,
            req.body.payMethod,
            req.body.deviceType,
            req.user.userId,
        );
        console.log('支付已发起:', responseData);
        return responseData; // 根据实际情况返回给前端的信息
    }

    @Get('notify') // 异步通知的路由，通常由支付平台发起GET请求
    async handlePaymentNotification(@Req() request, @Res() response): Promise<any> {
        try {
            const notifyResult = await this.payService.handleNotification(request);
            if (notifyResult === 'success') {
                response.status(200).send(notifyResult); // 返回success给支付平台
            } else {
                response.status(500).send(notifyResult); // 错误情况下可根据需要调整响应状态码
            }
        } catch (error) {
            response.status(500).send('Error processing notification.'); // 处理异常情况
        }
    }

    @Post('query')
    async queryPaymentStatus(@Req() req): Promise<any> {
        return await this.payService.queryPaymentStatus(req.body.tradeId);
    }


    // 根据JWT获取支付记录
    @UseGuards(JwtAuthGuard)
    @Get('syncinfos')
    async syncInfos(@Req() req) {
        // userId是必然不会变动的信息，所以用UseGuards来从JWT中取出，以从数据库中获取动态信息
        const payerId = req.user.userId;
        return await this.payService.getPayInfos(payerId);
    }

}
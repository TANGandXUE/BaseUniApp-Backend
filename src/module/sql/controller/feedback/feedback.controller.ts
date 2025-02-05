import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { SqlService } from '../../service/sql/sql.service';

@Controller('sql/feedback')
export class FeedbackController {

    constructor(
        private sqlService: SqlService,
    ) { }

    // 发送反馈
    @Post('sendfeedback')
    @UseGuards(JwtAuthGuard)
    async sendFeedback(@Req() req) {

        return await this.sqlService.sendFeedback(
            req.user.userId,
            req.user.userName,
            req.user.userPhone,
            req.user.userEmail,
            req.body.feedbackText
        );

    }


}

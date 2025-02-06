import { Controller, Get, Post, Render, Req } from '@nestjs/common';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { AlimsgService } from 'src/module/api/service/alimsg/alimsg.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { json } from 'stream/consumers';

@Controller('/user/register')
@ApiTags('用户注册相关')
export class RegisterController {

    constructor(
        private readonly sqlService: SqlService,
        private readonly alimsgService: AlimsgService
    ) { }

    //默认方法
    @Get()
    @Render('user/register')
    hello() {

    }

    // http://localhost:3000/user/register/post
    @Post('post')
    // 使用了中间件处理参数，代码重构时应改成守卫
    async register(@Req() req) {
        const registerParams = {
            userName: req.body.userName,
            userPassword: req.body.userPassword,
            userPhone: req.body.userPhone,
            userEmail: req.body.userEmail,
        }
        console.log("registerParams: ", registerParams);

        const result = await this.sqlService.register(registerParams);
        console.log("result: ", result);
        return result;
    }

    @Post('getcode')
    @ApiOperation({ summary: '获取验证码' })
    async getCode(@Req() req) {
        const smsDtos = await this.alimsgService.smsService(
            req.body.userPhoneOrEmail,
            process.env.SMS_SIGN_NAME,
            process.env.SMS_TEMPLATE_CODE,
        )
        console.log('smsStatus: ', smsDtos);
        return smsDtos;
    }

    @Post('getcodewithvalidate')
    @ApiOperation({ summary: '获取验证码，并验证手机号或邮箱在数据库中是否存在' })
    async getCodeWithValidate(@Req() req) {
        const smsDtos = await this.alimsgService.smsServiceWithValidate(
            req.body.userPhoneOrEmail,
            process.env.SMS_SIGN_NAME,
            process.env.SMS_TEMPLATE_CODE,
        )
        console.log('smsStatus: ', smsDtos);
        return smsDtos;
    }

    @Post('forgetpassword')
    async forgetPassword(@Req() req) {

        // 解析request
            const userPhone = req.body.userPhone;
            const userEmail = req.body.userEmail;
            const userPassword = req.body.userPassword;
            const updateType = 'userPassword';

        // 根据手机号或邮箱重设密码
        return await this.sqlService.updateUserInfo(userPhone, userEmail, userPassword, updateType);

    }


}

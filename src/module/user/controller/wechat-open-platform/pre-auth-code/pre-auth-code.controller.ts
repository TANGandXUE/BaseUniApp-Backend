import { Controller, Get } from '@nestjs/common';
import { PreAuthCodeService } from '../../../service/wechat-open-platform/pre-auth-code/pre-auth-code.service';

@Controller('user/wechat-open-platform/pre-auth-code')
export class PreAuthCodeController {
    constructor(private readonly preAuthCodeService: PreAuthCodeService) {}

    @Get()
    async getPreAuthCode() {
        return await this.preAuthCodeService.getPreAuthCode();
    }
}

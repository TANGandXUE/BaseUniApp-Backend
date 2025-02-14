import { Controller, Get } from '@nestjs/common';
import { ComponentAccessTokenService } from '../../../service/wechat-open-platform/component-access-token/component-access-token.service';

@Controller('user/wechat-open-platform/component-access-token')
export class ComponentAccessTokenController {
    constructor(private readonly componentAccessTokenService: ComponentAccessTokenService) {}

    @Get()
    async getAccessToken() {
        return await this.componentAccessTokenService.getAccessToken();
    }
}

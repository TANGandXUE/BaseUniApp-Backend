import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ComponentAccessTokenService } from '../component-access-token/component-access-token.service';

@Injectable()
export class PreAuthCodeService {
    constructor(
        private readonly httpService: HttpService,
        private readonly componentAccessTokenService: ComponentAccessTokenService
    ) {}

    async getPreAuthCode(): Promise<{ preAuthCode: string }> {
        try {
            const accessToken = await this.componentAccessTokenService.getAccessToken();
            const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;

            const response = await firstValueFrom(
                this.httpService.post(
                    `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${accessToken.accessToken}`,
                    { component_appid: appId }
                )
            );

            if (!response.data.pre_auth_code) {
                throw new Error('获取预授权码失败: 返回数据格式错误');
            }

            return {
                preAuthCode: response.data.pre_auth_code
            };
        } catch (error) {
            console.error('获取预授权码失败:', error);
            throw new HttpException(
                error.response?.data?.errmsg || '获取预授权码失败',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

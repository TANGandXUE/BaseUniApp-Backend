import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuthorizerToken } from '../../../../../entities/wechatOpenPlatform/authorizer-token.entity';
import { ComponentAccessTokenService } from '../component-access-token/component-access-token.service';
import { PreAuthCodeService } from '../pre-auth-code/pre-auth-code.service';

@Injectable()
export class AuthorizerService {
    constructor(
        @InjectRepository(AuthorizerToken)
        private authorizerTokenRepository: Repository<AuthorizerToken>,
        private readonly httpService: HttpService,
        private readonly componentAccessTokenService: ComponentAccessTokenService,
        private readonly preAuthCodeService: PreAuthCodeService
    ) {}

    /**
     * 生成授权链接
     */
    async generateAuthUrl(authType: number = 3, redirectUri: string): Promise<string> {
        const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;
        const preAuthCode = await this.preAuthCodeService.getPreAuthCode();
        
        // 生成PC端授权链接
        return `https://mp.weixin.qq.com/cgi-bin/componentloginpage?` +
            `component_appid=${appId}&` +
            `pre_auth_code=${preAuthCode.preAuthCode}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `auth_type=${authType}`;
    }

    /**
     * 处理授权回调，获取授权信息
     */
    async handleAuthCallback(authCode: string): Promise<AuthorizerToken> {
        const accessToken = await this.componentAccessTokenService.getAccessToken();
        const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=${accessToken.accessToken}`,
                    {
                        component_appid: appId,
                        authorization_code: authCode
                    }
                )
            );

            const authInfo = response.data.authorization_info;
            console.log('获取授权信息成功:', authInfo);
            return await this.saveAuthorizerToken(authInfo);
        } catch (error) {
            console.error('获取授权信息失败:', error);
            throw new HttpException(
                error.response?.data?.errmsg || '获取授权信息失败',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 获取授权方令牌
     */
    async getAuthorizerToken(authorizerAppid: string): Promise<AuthorizerToken> {
        // 1. 检查是否有有效token
        const validToken = await this.getValidToken(authorizerAppid);
        if (validToken) {
            return validToken;
        }

        // 2. 如果没有有效token，使用refresh_token刷新
        return await this.refreshAuthorizerToken(authorizerAppid);
    }

    async deleteToken(authorizerAppid: string): Promise<void> {
        await this.authorizerTokenRepository.delete({ authorizerAppid });
    }

    async getValidToken(authorizerAppid?: string): Promise<AuthorizerToken | null> {
        const token = await this.authorizerTokenRepository.findOne({
            where: authorizerAppid ? { authorizerAppid } : {},
            order: { createTime: 'DESC' }
        });

        if (!token) return null;

        const now = new Date();
        const tokenAge = now.getTime() - token.createTime.getTime();
        const expiresIn = (token.expiresIn - 600) * 1000;

        return tokenAge < expiresIn ? token : null;
    }

    private async refreshAuthorizerToken(authorizerAppid: string): Promise<AuthorizerToken> {
        const token = await this.authorizerTokenRepository.findOne({
            where: { authorizerAppid },
            order: { createTime: 'DESC' }
        });

        if (!token) {
            throw new HttpException('未找到授权信息', HttpStatus.NOT_FOUND);
        }

        const accessToken = await this.componentAccessTokenService.getAccessToken();
        const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=${accessToken.accessToken}`,
                    {
                        component_appid: appId,
                        authorizer_appid: authorizerAppid,
                        authorizer_refresh_token: token.refreshToken
                    }
                )
            );

            return await this.saveAuthorizerToken({
                authorizer_appid: authorizerAppid,
                authorizer_access_token: response.data.authorizer_access_token,
                authorizer_refresh_token: response.data.authorizer_refresh_token,
                expires_in: response.data.expires_in,
                func_info: token.funcInfo // 保持原有的权限信息
            });
        } catch (error) {
            console.error('刷新授权令牌失败:', error);
            throw new HttpException(
                error.response?.data?.errmsg || '刷新授权令牌失败',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    private async saveAuthorizerToken(authInfo: any): Promise<AuthorizerToken> {
        const token = this.authorizerTokenRepository.create({
            authorizerAppid: authInfo.authorizer_appid,
            accessToken: authInfo.authorizer_access_token,
            refreshToken: authInfo.authorizer_refresh_token,
            expiresIn: authInfo.expires_in,
            funcInfo: authInfo.func_info
        });

        return await this.authorizerTokenRepository.save(token);
    }
} 
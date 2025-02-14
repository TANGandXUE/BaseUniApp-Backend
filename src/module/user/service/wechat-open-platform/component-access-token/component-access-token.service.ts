import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ComponentAccessToken } from '../../../../../entities/wechatOpenPlatform/component-access-token.entity';
import { VerifyTicketService } from '../verify-ticket/verify-ticket.service';

@Injectable()
export class ComponentAccessTokenService {
    constructor(
        @InjectRepository(ComponentAccessToken)
        private componentAccessTokenRepository: Repository<ComponentAccessToken>,
        private readonly httpService: HttpService,
        private readonly verifyTicketService: VerifyTicketService
    ) {}

    async getAccessToken(): Promise<ComponentAccessToken> {
        const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;
        
        // 1. 检查数据库中是否有有效token
        const validToken = await this.getValidToken(appId);
        if (validToken) {
            return validToken;
        }

        // 2. 如果没有有效token，清理过期token
        await this.cleanExpiredTokens(appId);

        // 3. 获取新token
        return await this.fetchNewToken();
    }

    private async getValidToken(appId: string): Promise<ComponentAccessToken | null> {
        const token = await this.componentAccessTokenRepository.findOne({
            where: { appId },
            order: { createTime: 'DESC' }
        });

        if (!token) return null;

        // 检查token是否在有效期内(提前10分钟过期)
        const now = new Date();
        const tokenAge = now.getTime() - token.createTime.getTime();
        const expiresIn = (token.expiresIn - 600) * 1000; // 转换为毫秒并提前10分钟过期

        return tokenAge < expiresIn ? token : null;
    }

    private async cleanExpiredTokens(appId: string): Promise<void> {
        const expiryTime = new Date(Date.now() - 7200 * 1000); // 2小时前
        await this.componentAccessTokenRepository.delete({
            appId,
            createTime: LessThan(expiryTime)
        });
    }

    private async fetchNewToken(): Promise<ComponentAccessToken> {
        try {
            // 1. 获取必要参数
            const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;
            const appSecret = process.env.WECHAT_OPEN_PLATFORM_APP_SECRET;
            const verifyTicket = await this.verifyTicketService.getLatestTicket();

            if (!verifyTicket) {
                throw new HttpException('未找到有效的 verify ticket', HttpStatus.NOT_FOUND);
            }

            // 2. 请求微信接口
            const response = await firstValueFrom(
                this.httpService.post('https://api.weixin.qq.com/cgi-bin/component/api_component_token', {
                    component_appid: appId,
                    component_appsecret: appSecret,
                    component_verify_ticket: verifyTicket.ticket
                })
            );

            // 检查响应数据
            if (!response.data.component_access_token || !response.data.expires_in) {
                console.error('微信返回数据异常:', response.data);
                throw new Error('获取 access token 失败: 返回数据格式错误');
            }

            // 3. 保存到数据库
            const token = this.componentAccessTokenRepository.create({
                appId,
                accessToken: response.data.component_access_token,
                expiresIn: response.data.expires_in
            });
            
            return await this.componentAccessTokenRepository.save(token);
        } catch (error) {
            console.error('获取 component_access_token 失败:', error);
            throw new HttpException(
                error.response?.data?.errmsg || '获取 access token 失败',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

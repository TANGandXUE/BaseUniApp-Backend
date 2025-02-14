import { Controller, Get, Post, Query, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../others/jwt-auth.guard';
import { AuthorizerService } from '../../../service/wechat-open-platform/authorizer/authorizer.service';

@Controller('user/wechat-open-platform/authorizer')
export class AuthorizerController {
    constructor(private readonly authorizerService: AuthorizerService) {}

    @Get('url')
    async getAuthUrl(
        @Query('redirectUri') redirectUri: string,
        @Query('authType') authType: number = 3
    ) {
        return {
            isSuccess: true,
            message: '获取授权链接成功',
            data: {
                url: await this.authorizerService.generateAuthUrl(authType, redirectUri)
            }
        };
    }

    @Get('callback')
    async handleCallback(
        @Query('auth_code') authCode: string,
        @Query('expires_in') expiresIn: number
    ) {
        return {
            isSuccess: true,
            message: '获取授权信息成功',
            data: await this.authorizerService.handleAuthCallback(authCode)
        };
    }

    @Get('token')
    async getToken(@Query('authorizerAppid') authorizerAppid: string) {
        return {
            isSuccess: true,
            message: '获取授权信息成功',
            data: await this.authorizerService.getAuthorizerToken(authorizerAppid)
        };
    }

    @Get('status')
    @UseGuards(JwtAuthGuard)
    async checkStatus(@Req() req) {
        try {
            const token = await this.authorizerService.getValidToken();
            console.log('获取状态成功:', token);
            return {
                isSuccess: true,
                message: '获取状态成功',
                data: token ? {
                    authorizerAppid: token.authorizerAppid,
                    authorizerInfo: {
                        // 使用现有的 funcInfo 字段中的数据
                        ...token.funcInfo
                    }
                } : null
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message || '获取状态失败',
                data: null
            };
        }
    }

    @Post('unbind')
    @UseGuards(JwtAuthGuard)
    async unbind(@Body('authorizerAppid') authorizerAppid: string) {
        try {
            await this.authorizerService.deleteToken(authorizerAppid);
            return {
                isSuccess: true,
                message: '解绑成功',
                data: null
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message || '解绑失败',
                data: null
            };
        }
    }
}
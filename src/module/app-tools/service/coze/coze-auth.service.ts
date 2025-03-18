import { Injectable, Logger } from '@nestjs/common';
import { COZE_CONSTANTS_CN, COZE_CONSTANTS_COM } from '../../config/coze.constants';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

// 定义API类型枚举
export enum CozeApiType {
    CN = 'cn',
    COM = 'com'
}

interface TokenInfo {
    token: string;
    expiry: number;
    refreshing?: Promise<string>; // 用于处理并发刷新请求
}

@Injectable()
export class CozeAuthService {
    private readonly logger = new Logger(CozeAuthService.name);
    // 使用嵌套Map存储不同API类型的token
    private sessionTokens: Map<string, Map<CozeApiType, TokenInfo>> = new Map();
    private readonly REFRESH_THRESHOLD = 30; // 提前30秒刷新token
    private readonly MAX_RETRIES = 3; // 最大重试次数
    private readonly RETRY_DELAY = 1000; // 重试延迟（毫秒）

    constructor() {}

    private generateJti(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private getApiConstants(apiType: CozeApiType) {
        return apiType === CozeApiType.CN ? COZE_CONSTANTS_CN : COZE_CONSTANTS_COM;
    }

    private async generateJWT(userId: number, apiType: CozeApiType): Promise<string> {
        const constants = this.getApiConstants(apiType);
        const now = Math.floor(Date.now() / 1000);
        const sessionName = userId.toString();

        const payload = {
            iss: constants.APP_ID,
            aud: constants.API_ENDPOINT,
            iat: now,
            exp: now + constants.JWT_EXPIRES_IN,
            jti: this.generateJti(),
            session_name: sessionName
        };

        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: constants.PUBLIC_KEY
        };

        return jwt.sign(payload, constants.PRIVATE_KEY, {
            algorithm: 'RS256',
            header
        });
    }

    private async refreshToken(userId: number, apiType: CozeApiType, retryCount = 0): Promise<string> {
        const constants = this.getApiConstants(apiType);
        try {
            const jwtToken = await this.generateJWT(userId, apiType);
            
            const response = await axios.post(constants.TOKEN_URL, {
                duration_seconds: constants.ACCESS_TOKEN_DURATION,
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            return response.data.access_token;
        } catch (error) {
            if (retryCount < this.MAX_RETRIES) {
                this.logger.warn(`Token refresh failed for API type ${apiType}, retrying (${retryCount + 1}/${this.MAX_RETRIES})...错误信息:${error}`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.refreshToken(userId, apiType, retryCount + 1);
            }
            throw error;
        }
    }

    public async getAccessToken(userId: number, apiType: CozeApiType = CozeApiType.CN): Promise<string> {
        const constants = this.getApiConstants(apiType);
        console.log('constants', constants);
        const now = Math.floor(Date.now() / 1000);
        const sessionName = userId.toString();

        // 确保用户的token映射存在
        if (!this.sessionTokens.has(sessionName)) {
            this.sessionTokens.set(sessionName, new Map());
        }

        const userTokens = this.sessionTokens.get(sessionName);
        // 获取当前API类型的token信息
        let tokenInfo = userTokens.get(apiType);

        // 如果token仍然有效且不需要刷新
        if (tokenInfo?.token && tokenInfo.expiry > now + this.REFRESH_THRESHOLD) {
            this.logger.debug(`Using cached token for session ${sessionName}, API type ${apiType}`);
            return tokenInfo.token;
        }

        // 如果已经有刷新请求在进行中，等待其完成
        if (tokenInfo?.refreshing) {
            this.logger.debug(`Waiting for ongoing token refresh for session ${sessionName}, API type ${apiType}`);
            return tokenInfo.refreshing;
        }

        // 创建新的刷新请求
        const refreshPromise = this.refreshToken(userId, apiType)
            .then(newToken => {
                // 更新token信息
                userTokens.set(apiType, {
                    token: newToken,
                    expiry: now + constants.ACCESS_TOKEN_DURATION
                });
                return newToken;
            })
            .finally(() => {
                // 清理refreshing状态
                const currentInfo = userTokens.get(apiType);
                if (currentInfo) {
                    delete currentInfo.refreshing;
                }
            });

        // 保存刷新请求
        if (!tokenInfo) {
            tokenInfo = { token: '', expiry: 0 };
            userTokens.set(apiType, tokenInfo);
        }
        tokenInfo.refreshing = refreshPromise;

        return refreshPromise;
    }

    // 清理指定session的token
    public clearSessionToken(userId: number, apiType?: CozeApiType): void {
        const sessionName = userId.toString();
        const userTokens = this.sessionTokens.get(sessionName);
        
        if (userTokens) {
            if (apiType) {
                // 清理特定API类型的token
                userTokens.delete(apiType);
                this.logger.debug(`Cleared token for session ${sessionName}, API type ${apiType}`);
            } else {
                // 清理所有API类型的token
                this.sessionTokens.delete(sessionName);
                this.logger.debug(`Cleared all tokens for session ${sessionName}`);
            }
        }
    }

    // 清理所有过期的token
    public cleanupExpiredTokens(): void {
        const now = Math.floor(Date.now() / 1000);
        
        for (const [sessionName, userTokens] of this.sessionTokens.entries()) {
            let shouldDeleteSession = true;
            
            for (const [apiType, tokenInfo] of userTokens.entries()) {
                if (tokenInfo.expiry <= now && !tokenInfo.refreshing) {
                    userTokens.delete(apiType);
                    this.logger.debug(`Cleaned up expired token for session ${sessionName}, API type ${apiType}`);
                } else {
                    shouldDeleteSession = false;
                }
            }
            
            // 如果用户所有token都已过期，删除整个session
            if (shouldDeleteSession) {
                this.sessionTokens.delete(sessionName);
            }
        }
    }
} 
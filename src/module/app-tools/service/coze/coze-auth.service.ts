import { Injectable, Logger } from '@nestjs/common';
import { COZE_CONSTANTS } from '../../config/coze.constants';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

interface TokenInfo {
    token: string;
    expiry: number;
    refreshing?: Promise<string>; // 用于处理并发刷新请求
}

@Injectable()
export class CozeAuthService {
    private readonly logger = new Logger(CozeAuthService.name);
    private sessionTokens: Map<string, TokenInfo> = new Map();
    private readonly REFRESH_THRESHOLD = 30; // 提前30秒刷新token
    private readonly MAX_RETRIES = 3; // 最大重试次数
    private readonly RETRY_DELAY = 1000; // 重试延迟（毫秒）

    constructor() {}

    private generateJti(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private async generateJWT(userId: number): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const sessionName = userId.toString();

        const payload = {
            iss: COZE_CONSTANTS.APP_ID,
            aud: COZE_CONSTANTS.API_ENDPOINT,
            iat: now,
            exp: now + COZE_CONSTANTS.JWT_EXPIRES_IN,
            jti: this.generateJti(),
            session_name: sessionName
        };

        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: COZE_CONSTANTS.PUBLIC_KEY
        };

        return jwt.sign(payload, COZE_CONSTANTS.PRIVATE_KEY, {
            algorithm: 'RS256',
            header
        });
    }

    private async refreshToken(userId: number, retryCount = 0): Promise<string> {
        try {
            const jwtToken = await this.generateJWT(userId);
            
            const response = await axios.post(COZE_CONSTANTS.TOKEN_URL, {
                duration_seconds: COZE_CONSTANTS.ACCESS_TOKEN_DURATION,
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
                this.logger.warn(`Token refresh failed, retrying (${retryCount + 1}/${this.MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.refreshToken(userId, retryCount + 1);
            }
            throw error;
        }
    }

    public async getAccessToken(userId: number): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const sessionName = userId.toString();

        // 获取当前session的token信息
        let tokenInfo = this.sessionTokens.get(sessionName);

        // 如果token仍然有效且不需要刷新
        if (tokenInfo?.token && tokenInfo.expiry > now + this.REFRESH_THRESHOLD) {
            this.logger.debug(`Using cached token for session ${sessionName}`);
            return tokenInfo.token;
        }

        // 如果已经有刷新请求在进行中，等待其完成
        if (tokenInfo?.refreshing) {
            this.logger.debug(`Waiting for ongoing token refresh for session ${sessionName}`);
            return tokenInfo.refreshing;
        }

        // 创建新的刷新请求
        const refreshPromise = this.refreshToken(userId)
            .then(newToken => {
                // 更新token信息
                this.sessionTokens.set(sessionName, {
                    token: newToken,
                    expiry: now + COZE_CONSTANTS.ACCESS_TOKEN_DURATION
                });
                return newToken;
            })
            .finally(() => {
                // 清理refreshing状态
                const currentInfo = this.sessionTokens.get(sessionName);
                if (currentInfo) {
                    delete currentInfo.refreshing;
                }
            });

        // 保存刷新请求
        if (!tokenInfo) {
            tokenInfo = { token: '', expiry: 0 };
            this.sessionTokens.set(sessionName, tokenInfo);
        }
        tokenInfo.refreshing = refreshPromise;

        return refreshPromise;
    }

    // 清理指定session的token
    public clearSessionToken(userId: number): void {
        const sessionName = userId.toString();
        this.sessionTokens.delete(sessionName);
        this.logger.debug(`Cleared token for session ${sessionName}`);
    }

    // 清理所有过期的token
    public cleanupExpiredTokens(): void {
        const now = Math.floor(Date.now() / 1000);
        for (const [sessionName, tokenInfo] of this.sessionTokens.entries()) {
            if (tokenInfo.expiry <= now && !tokenInfo.refreshing) {
                this.sessionTokens.delete(sessionName);
                this.logger.debug(`Cleaned up expired token for session ${sessionName}`);
            }
        }
    }
} 
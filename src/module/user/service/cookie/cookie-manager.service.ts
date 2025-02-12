import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';

interface Cookie {
    value: string;
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
}

@Injectable()
export class CookieManagerService {
    private cookieStore: Map<string, Map<string, Cookie>> = new Map();

    // 解析Set-Cookie头
    private parseCookie(cookieStr: string): { name: string; cookie: Cookie } {
        const parts = cookieStr.split(';').map(part => part.trim());
        const [nameValue, ...attributes] = parts;
        const [name, value] = nameValue.split('=').map(s => s.trim());

        const cookie: Cookie = { value };

        attributes.forEach(attr => {
            const [key, val] = attr.split('=').map(s => s.trim());
            switch (key.toLowerCase()) {
                case 'expires':
                    cookie.expires = new Date(val);
                    break;
                case 'path':
                    cookie.path = val;
                    break;
                case 'domain':
                    cookie.domain = val;
                    break;
                case 'secure':
                    cookie.secure = true;
                    break;
                case 'httponly':
                    cookie.httpOnly = true;
                    break;
            }
        });

        return { name, cookie };
    }

    // 从响应中更新Cookie
    updateCookies(sessionId: string, response: AxiosResponse): void {
        const setCookieHeaders = response.headers['set-cookie'];
        if (!setCookieHeaders) return;

        let sessionCookies = this.cookieStore.get(sessionId);
        if (!sessionCookies) {
            sessionCookies = new Map();
            this.cookieStore.set(sessionId, sessionCookies);
        }

        console.log('收到新的Cookie:', setCookieHeaders);

        for (const cookieHeader of setCookieHeaders) {
            const { name, cookie } = this.parseCookie(cookieHeader);
            
            // 如果cookie已过期，则删除它
            if (cookie.expires && cookie.expires < new Date()) {
                sessionCookies.delete(name);
                console.log(`Cookie ${name} 已过期，已删除`);
                continue;
            }

            // 保存或更新cookie
            sessionCookies.set(name, cookie);
            console.log(`更新Cookie: ${name}=${cookie.value}`);
        }

        console.log(`会话 ${sessionId} 的Cookie更新完成:`, 
            Array.from(sessionCookies.entries())
                .map(([name, cookie]) => `${name}=${cookie.value}`)
                .join('; ')
        );
    }

    // 获取Cookie头
    getCookieHeader(sessionId: string): string {
        const sessionCookies = this.cookieStore.get(sessionId);
        if (!sessionCookies || sessionCookies.size === 0) {
            return `sessionid=${sessionId}`;
        }

        const now = new Date();
        const validCookies = Array.from(sessionCookies.entries())
            .filter(([_, cookie]) => !cookie.expires || cookie.expires > now)
            .map(([name, cookie]) => `${name}=${cookie.value}`);

        // 添加sessionid
        validCookies.push(`sessionid=${sessionId}`);

        const cookieHeader = validCookies.join('; ');
        console.log(`生成Cookie头 [${sessionId}]:`, cookieHeader);
        return cookieHeader;
    }

    // 检查Cookie是否有效
    isCookieValid(sessionId: string): boolean {
        const sessionCookies = this.cookieStore.get(sessionId);
        if (!sessionCookies || sessionCookies.size === 0) {
            return false;
        }

        const now = new Date();
        const hasValidCookies = Array.from(sessionCookies.values()).some(
            cookie => !cookie.expires || cookie.expires > now
        );

        console.log(`检查Cookie有效性 [${sessionId}]:`, hasValidCookies);
        return hasValidCookies;
    }

    // 清除指定会话的Cookie
    clearCookies(sessionId: string): void {
        this.cookieStore.delete(sessionId);
        console.log(`已清除会话 ${sessionId} 的所有Cookie`);
    }
} 
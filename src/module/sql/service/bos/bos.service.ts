import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import moment from 'moment';
import axios from 'axios';

@Injectable()
export class BosService {
    private readonly accessKeyId = process.env.BOS_ACCESS_KEY_ID;
    private readonly secretAccessKey = process.env.BOS_SECRET_ACCESS_KEY;
    private readonly region = process.env.BOS_REGION;
    private readonly bucket = process.env.BOS_BUCKET;
    private readonly expires = process.env.BOS_EXPIRES || '1800';

    /**
     * 获取endpoint
     */
    private getEndpoint(): string {
        return `https://${this.bucket}.${this.region}.bcebos.com`;
    }

    /**
     * 检查文件是否存在
     */
    private async isExistObject(fileName: string): Promise<boolean> {
        try {
            const timestamp = moment().utc().format('YYYY-MM-DD[T]HH:mm:ss[Z]');
            const authStringPrefix = `bce-auth-v1/${this.accessKeyId}/${timestamp}/3600`;
            const signingKey = this.hmacSha256Hex(this.secretAccessKey, authStringPrefix);
            
            // 构建规范请求字符串
            const canonicalRequest = [
                'HEAD',
                this.uriEncodeExceptSlash(`/${fileName}`),
                '',
                `host:${this.bucket}.${this.region}.bcebos.com`
            ].join('\n');

            const signature = this.hmacSha256Hex(signingKey, canonicalRequest);
            const authorization = `${authStringPrefix}/host/${signature}`;

            const response = await axios.head(`${this.getEndpoint()}/${fileName}`, {
                headers: {
                    'Host': `${this.bucket}.${this.region}.bcebos.com`,
                    'Authorization': authorization,
                    'x-bce-date': timestamp
                },
                validateStatus: function (status) {
                    return status === 200 || status === 404; // 允许404状态
                },
            });

            return response.status === 200;
        } catch (error) {
            console.error('检查BOS文件是否存在时出错:', error);
            return false;
        }
    }

    /**
     * 重命名文件（生成新的文件名）
     */
    async reNameFileName(fileName: string): Promise<string> {
        // 分割文件名和扩展名
        const parts = fileName.split('.');
        const extension = parts.length > 1 ? `.${parts.pop()}` : '';
        const baseName = parts.join('.');
        
        let suffix = 1;
        let newFileName: string;

        // 循环直到找到一个不存在的文件名
        while (true) {
            newFileName = suffix > 1 ? `${baseName}-${suffix}${extension}` : `${baseName}${extension}`;
            console.log('检查文件名:', newFileName);
            
            const exists = await this.isExistObject(newFileName);
            console.log('文件是否存在:', exists);
            
            if (!exists) {
                break;
            }
            suffix++;
        }

        return newFileName;
    }

    /**
     * 生成签名
     */
    async getSignature(httpMethod: string, path: string, queries: Record<string, any>, headers: Record<string, string>): Promise<any> {
        try {
            const timestamp = moment().utc().format('YYYY-MM-DD[T]HH:mm:ss[Z]');
            const expirationPeriodInSeconds = this.expires;
            
            // 1. 创建前缀字符串(authStringPrefix)
            const authStringPrefix = `bce-auth-v1/${this.accessKeyId}/${timestamp}/${expirationPeriodInSeconds}`;
            
            // 2. 生成派生密钥(signingKey)
            const signingKey = this.hmacSha256Hex(this.secretAccessKey, authStringPrefix);
            
            // 3. 生成规范请求字符串(canonicalRequest)
            // 3.1 HTTP Method
            const canonicalHttpMethod = httpMethod;
            
            // 3.2 CanonicalURI
            const canonicalUri = this.uriEncodeExceptSlash(path);
            
            // 3.3 CanonicalQueryString
            const canonicalQueryString = Object.keys(queries)
                .filter(key => key !== 'authorization')
                .sort()
                .map(key => queries[key] ? `${this.uriEncode(key)}=${this.uriEncode(queries[key])}` : `${this.uriEncode(key)}=`)
                .join('&');
            
            // 3.4 CanonicalHeaders
            const canonicalHeaders = Object.keys(headers)
                .sort()
                .map(key => `${this.uriEncode(key.toLowerCase())}:${this.uriEncode(headers[key].trim())}`)
                .join('\n');
            
            // 3.5 SignedHeaders
            const signedHeaders = Object.keys(headers)
                .sort()
                .map(key => key.toLowerCase())
                .join(';');
            
            // 3.6 组合 canonicalRequest
            const canonicalRequest = [
                canonicalHttpMethod,
                canonicalUri,
                canonicalQueryString,
                canonicalHeaders
            ].join('\n');
            
            // 4. 生成签名
            const signature = this.hmacSha256Hex(signingKey, canonicalRequest);
            
            // 5. 生成认证字符串
            const authorization = `${authStringPrefix}/${signedHeaders}/${signature}`;

            // 返回前端需要的信息
            return {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
                sessionToken: '',
                endpoint: this.getEndpoint(),
                bucket: this.bucket,
                region: this.region,
                authorization,
                timestamp,
                expires: this.expires,
            };
        } catch (error) {
            console.error('生成BOS签名失败:', error);
            throw error;
        }
    }

    /**
     * URI编码（保留斜杠）
     */
    private uriEncodeExceptSlash(str: string): string {
        return encodeURIComponent(str).replace(/%2F/g, '/');
    }

    /**
     * URI编码
     */
    private uriEncode(str: string): string {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    /**
     * HMAC-SHA256-HEX
     */
    private hmacSha256Hex(key: string, message: string): string {
        return crypto
            .createHmac('sha256', key)
            .update(message)
            .digest('hex')
            .toLowerCase();
    }
}

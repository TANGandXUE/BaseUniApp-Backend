import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { ComponentVerifyTicket } from '../../../../../entities/wechatOpenPlatform/component-verify-ticket.entity';

@Injectable()
export class VerifyTicketService {
    private readonly token: string;
    private readonly encodingAESKey: string;
    private readonly appId: string;
    private readonly aesKey: Buffer;
    private readonly iv: Buffer;

    constructor(
        @InjectRepository(ComponentVerifyTicket)
        private componentVerifyTicketRepository: Repository<ComponentVerifyTicket>
    ) {
        // 从环境变量获取配置
        this.token = process.env.WECHAT_OPEN_PLATFORM_TOKEN;
        this.encodingAESKey = process.env.WECHAT_OPEN_PLATFORM_ENCODING_AES_KEY;
        this.appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;

        if (!this.token || !this.encodingAESKey || !this.appId) {
            throw new Error('微信开放平台配置缺失');
        }

        // 初始化解密所需的key和iv
        this.aesKey = Buffer.from(this.encodingAESKey + '=', 'base64');
        this.iv = this.aesKey.slice(0, 16);
    }

    /**
     * 验证消息签名
     */
    async verifySignature(timestamp: string, nonce: string, msgSignature: string, body: string): Promise<boolean> {
        try {
            // 从xml中提取加密内容
            const encrypt = this.extractEncryptFromXml(body);

            // 按字典序排序
            const params = [this.token, timestamp, nonce, encrypt].sort();

            // 拼接后进行sha1签名
            const signature = crypto
                .createHash('sha1')
                .update(params.join(''))
                .digest('hex');

            if (signature !== msgSignature) {
                throw new HttpException('消息签名验证失败', HttpStatus.UNAUTHORIZED);
            }

            return true;
        } catch (error) {
            console.error('验证签名失败:', error);
            throw error;
        }
    }

    /**
     * 解密票据并保存
     */
    async decryptTicket(body: string): Promise<void> {
        try {
            const encrypt = this.extractEncryptFromXml(body);
            const encryptedData = Buffer.from(encrypt, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, this.iv);
            decipher.setAutoPadding(false);

            let decrypted = decipher.update(encryptedData).toString('utf8');
            decrypted += decipher.final().toString('utf8');
            decrypted = this.removePKCS7Padding(decrypted);
            const content = decrypted.slice(20, -this.appId.length);

            // 解析XML内容
            const appIdMatch = content.match(/<AppId><!\[CDATA\[(.*?)\]\]><\/AppId>/);
            const createTimeMatch = content.match(/<CreateTime>(\d+)<\/CreateTime>/);
            const ticketMatch = content.match(/<ComponentVerifyTicket><!\[CDATA\[(.*?)\]\]><\/ComponentVerifyTicket>/);

            if (!appIdMatch || !createTimeMatch || !ticketMatch) {
                throw new Error('无法从解密内容中提取必要信息');
            }

            const appId = appIdMatch[1];
            const createTime = parseInt(createTimeMatch[1]);
            const ticket = ticketMatch[1];

            // 保存到数据库
            await this.saveTicket(appId, createTime, ticket);
            
            console.log('解密后的ticket消息已保存到数据库');
        } catch (error) {
            console.error('解密ticket失败:', error);
            throw error;
        }
    }

    /**
     * 保存ticket并清理过期数据
     */
    private async saveTicket(appId: string, createTime: number, ticket: string): Promise<ComponentVerifyTicket> {
        // 清理12小时前的数据
        const expiryTime = new Date(Date.now() - 12 * 60 * 60 * 1000);
        await this.componentVerifyTicketRepository.delete({
            dbCreateTime: LessThan(expiryTime)
        });

        // 保存新ticket
        const ticketEntity = this.componentVerifyTicketRepository.create({
            appId,
            createTime,
            ticket
        });

        return await this.componentVerifyTicketRepository.save(ticketEntity);
    }

    /**
     * 获取最新的ticket
     */
    async getLatestTicket(): Promise<ComponentVerifyTicket | null> {
        const appId = process.env.WECHAT_OPEN_PLATFORM_APP_ID;
        return await this.componentVerifyTicketRepository.findOne({
            where: { appId },
            order: { createTime: 'DESC' }
        });
    }

    /**
     * 从XML中提取加密内容
     */
    private extractEncryptFromXml(xml: string): string {
        console.log('准备解析的XML:', xml);
        
        // 支持多种可能的XML格式
        const patterns = [
            /<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/,
            /<Encrypt>(.*?)<\/Encrypt>/
        ];
        
        for (const pattern of patterns) {
            const match = xml.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        throw new Error('无法从XML中提取加密内容，原始XML: ' + xml);
    }

    /**
     * 去除PKCS7填充
     */
    private removePKCS7Padding(decrypted: string): string {
        const pad = decrypted[decrypted.length - 1].charCodeAt(0);
        if (pad < 1 || pad > 32) {
            return decrypted;
        }
        return decrypted.slice(0, decrypted.length - pad);
    }
}

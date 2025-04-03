import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInfo } from '../../../../entities/userinfo.entity';
import { PayService } from '../../../api/service/pay/pay.service';

@Injectable()
export class InviteService {
    private readonly posterTemplate: string;
    private readonly frontendUrl: string;

    constructor(
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        private readonly payService: PayService,
    ) {
        this.frontendUrl = process.env.FRONTEND_URL;
        // 海报模板路径
        this.posterTemplate = 'https://clouddreamai.oss-cn-shanghai.aliyuncs.com/AIPlatform/apps/invite/SoooInvite.png';
    }

    /**
     * 根据邀请码生成邀请链接
     * @param inviteCode 用户邀请码
     * @returns 完整的邀请链接
     */
    generateInviteUrl(inviteCode: string): string {
        return `${this.frontendUrl}/#/pages/login/index?inviteCode=${inviteCode}`;
    }

    /**
     * 生成二维码图片
     * @param url 要编码的URL
     * @returns 返回二维码图片Buffer
     */
    async generateQRCode(url: string): Promise<Buffer> {
        try {
            // 生成二维码，返回Buffer
            return await QRCode.toBuffer(url, {
                errorCorrectionLevel: 'H', // 高容错率
                margin: 1,
                width: 300,
                color: {
                    dark: '#000',  // 二维码颜色
                    light: '#FFFFFF'  // 背景色
                }
            });
        } catch (error) {
            throw new Error(`生成二维码失败: ${error.message}`);
        }
    }

    /**
     * 将二维码合成到海报上
     * @param qrCodeBuffer 二维码图片Buffer
     * @param userInviteCode 用户邀请码
     * @returns 合成后的海报Buffer
     */
    async generateInvitePoster(userInviteCode: string): Promise<Buffer> {
        try {
            // 1. 下载海报模板
            const posterResponse = await fetch(this.posterTemplate);
            const posterBuffer = Buffer.from(await posterResponse.arrayBuffer());

            // 2. 生成邀请链接和二维码
            const inviteUrl = this.generateInviteUrl(userInviteCode);
            const qrCodeBuffer = await this.generateQRCode(inviteUrl);

            // 3. 获取海报尺寸
            const posterMetadata = await sharp(posterBuffer).metadata();

            // 5. 合成图片：二维码放置在海报上合适的位置
            // 注：根据模板可能需要调整这些值，这里使用的是预估值
            // 二维码左上角的位置（从海报左上角开始计算）
            const qrCodeLeft = Math.floor(posterMetadata.width * 0.36);  // 放在右侧大约36%的位置
            const qrCodeTop = Math.floor(posterMetadata.height * 0.4);  // 放在下方大约40%的位置
            const qrCodeWidth = 400;  // 二维码宽度

            // 调整二维码大小并旋转
            const resizedQrCode = await sharp(qrCodeBuffer)
                .resize(qrCodeWidth)  // 调整二维码大小
                .rotate(8, {
                    background: { r: 0, g: 0, b: 0, alpha: 0 }  // 使用透明背景
                })  // 向右旋转8度
                .toBuffer();

            // 6. 合成图片
            return await sharp(posterBuffer)
                .composite([
                    {
                        input: resizedQrCode,
                        top: qrCodeTop,
                        left: qrCodeLeft,
                    }
                ])
                .toBuffer();
        } catch (error) {
            throw new Error(`生成邀请海报失败: ${error.message}`);
        }
    }

    /**
     * 获取用户邀请的用户列表
     * @param userId 当前用户ID
     * @returns 被邀请用户列表
     */
    async getInvitedUsers(userId: number): Promise<any[]> {
        try {
            // 查询被当前用户邀请的所有用户
            const invitedUsers = await this.userInfoRepository.find({
                where: { userBeInvitedUserId: userId },
                select: [
                    'userId',
                    'userName',
                    'userStatus',
                    'userRegisterDate',
                    'userAvatarUrl'
                ]
            });

            // 获取每个被邀请用户的累计充值金额
            const invitedUsersWithPayment = await Promise.all(
                invitedUsers.map(async (user) => {
                    // 获取用户累计充值金额
                    const totalPayment = await this.payService.getUserTotalPayment(user.userId);

                    return {
                        id: user.userId,
                        name: user.userName,
                        status: user.userStatus,
                        registerDate: user.userRegisterDate,
                        avatarUrl: user.userAvatarUrl,
                        totalPayment // 添加累计充值金额
                    };
                })
            );

            return invitedUsersWithPayment;
        } catch (error) {
            throw new Error(`获取邀请用户列表失败: ${error.message}`);
        }
    }
}

// pay.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as QRCode from 'qrcode';
dotenv.config();
import { Pay } from 'src/entities/pay/pay.entity';
import { UserInfo } from 'src/entities/userinfo.entity';
import { Repository } from 'typeorm';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { ShopItemContent, ShopItems } from 'src/entities/shopItems.entity';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';

interface PaymentAssets {
    points?: {
        amount: number;
        durationMs: number;
    };
    membership?: {
        level: number;
        durationMs: number;
    };
    features: Array<{
        name: string;
        durationMs: number;
    }>;
}

@Injectable()
export class PayService {

    constructor(
        @InjectRepository(Pay)
        private readonly payRepository: Repository<Pay>,
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        // 注入服务
        private readonly sqlService: SqlService,
        private readonly userAssetsService: UserAssetsService
    ) { }


    private apiUrl = process.env.PAY_BASE_URL;
    private apiKey = process.env.PAY_API_KEY;

    private paymentAssets: PaymentAssets = { features: [] };

    // 初始化订单参数
    private data: any = {
        pid: Number(process.env.PAY_ID || '1000'),
        type: 'wxpay',
        out_trade_no: '202406170211',
        notify_url: process.env.PAY_NOTIFY_URL || 'https://31d5424h62.zicp.fun/api/pay/notify',
        return_url: process.env.PAY_RETURN_URL || 'https://sd.tangandxue.cn',
        name: 'VIP商品',
        money: '0.01',
        clientip: process.env.PAY_CLIENT_IP || '192.168.1.100',
        device: 'wechat',
    };
    private userId = 1;
    private addPoints = 0;
    private addExpireDate = 0;
    private addLevel = 0;
    private price = 0;

    // 查找订单信息是否存在
    private async elementExist(findKey: any, findValue: any) {
        // 根据提供的字段名和值查询用户信息
        return await this.payRepository.findOne({ where: { [findKey]: findValue } });
    }

    // 生成订单号
    private generateTradeNo(): string {
        const currentDate = new Date();
        const datePart = currentDate.toISOString().split('T')[0].replace(/-/g, ''); // 移除短横线
        const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0'); // 生成0-1亿之间的随机数并补零至8位
        return `${datePart}${randomPart}`;
    }

    public async startPayment(shopItemId: number, payMethod: string, deviceType: string, userId: number): Promise<any> {
        // 解析商品内容
        const responseData: any = await this.sqlService.getSingleShopItem(shopItemId);
        if (!responseData.isSuccess) throw new Error('商品获取失败');

        // 根据名称查询商品相关参数
        const { data: shopItemData, isSuccess } = await this.sqlService.getSingleShopItem(shopItemId);
        if (!shopItemData || !isSuccess) {
            throw new Error('商品信息获取失败');
        }

        // 使用类型断言确保类型安全
        const { shopItemName, shopItemPrice } = shopItemData as ShopItems;

        // 传入订单参数 to 数据库
        this.userId = userId;
        this.price = shopItemPrice;
        this.paymentAssets = this.parseShopContent(responseData.data.shopItemContent);

        // 传入订单参数 to Snapay
        this.data.name = shopItemName;
        this.data.money = shopItemPrice;
        this.data.type = payMethod;
        this.data.device = deviceType;
        // 递归生成订单号，直至无重复为止
        const generateTradeNoUntilNoRepeat = async () => {
            this.data.out_trade_no = this.generateTradeNo();
            if (await this.elementExist('payerTradeId', this.data.out_trade_no)) {
                generateTradeNoUntilNoRepeat();
            }
        }
        generateTradeNoUntilNoRepeat();

        this.data.sign = this.sign(this.data, this.apiKey); // 生成签名(不含sign和sign_type)
        this.data.sign_type = 'MD5';

        console.log(this.data);


        try {
            const response = await axios.post(this.apiUrl, this.data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            delete this.data.sign;
            delete this.data.sign_type;
            // 将trade_no和out_trade_no合并
            this.data.out_trade_no = response.data.trade_no
            console.log('更改后的data为', this.data);
            if (response.data.code == 1) {
                // console.log('发起支付成功:', response.data);
                // 如果存在二维码链接，将其转换为base64
                if (response.data.qrcode) {
                    try {
                        const qrcodeBase64 = await QRCode.toDataURL(response.data.qrcode);
                        response.data.qrcode = qrcodeBase64;
                    } catch (error) {
                        console.error('二维码转换失败:', error);
                        return { isSuccess: false, message: "发起支付成功，但二维码转换失败，具体错误信息为：" + error }
                    }
                }
                return { isSuccess: true, message: "发起支付成功", data: response.data }
            } else {
                // console.log('发起支付失败:', response.data);
                return { isSuccess: false, message: `发起支付成功，但Snapay返回异常: ${JSON.stringify(response.data)}` }
            }
        } catch (error) {
            return { isSuccess: false, message: "发起支付失败" }
        }
    }


    /* 加密签名 */
    private sign(params: object, apiKey: string) {
        const str =
            Object.keys(params)
                .sort()
                .map((key) => `${key}=${params[key]}`)
                .join('&') + apiKey;
        return crypto.createHash('md5').update(str).digest('hex');
    }


    // 处理支付结果
    public async handleNotification(req: any): Promise<string> {
        const receivedSign = req.query.sign;
        delete req.query.sign;
        delete req.query.sign_type;
        const calculatedSign = this.sign(req.query, this.apiKey);

        console.log('处理支付结果执行到了');

        if (receivedSign === calculatedSign) {
            // 创建支付记录
            const payInfo = this.payRepository.create({
                payerTradeId: this.data.out_trade_no,
                payerId: this.userId,
                payerPayAmount: this.price,
                pointsAmount: this.paymentAssets.points?.amount,
                pointsExpireInMs: this.paymentAssets.points?.durationMs,
                membershipLevel: this.paymentAssets.membership?.level,
                membershipExpireInMs: this.paymentAssets.membership?.durationMs,
                premiumFeatures: this.paymentAssets.features,
                payerHasAdded: false
            });

            try {
                await this.payRepository.save(payInfo);

                // 添加用户资产
                if (this.paymentAssets.points) {
                    await this.userAssetsService.addPoints(
                        this.userId,
                        this.paymentAssets.points.amount,
                        this.paymentAssets.points.durationMs
                    );
                }

                if (this.paymentAssets.membership) {
                    await this.userAssetsService.addMembership(
                        this.userId,
                        this.paymentAssets.membership.level,
                        this.paymentAssets.membership.durationMs
                    );
                }

                await Promise.all(
                    this.paymentAssets.features.map(feature =>
                        this.userAssetsService.addPremiumFeature(
                            this.userId,
                            feature.name,
                            feature.durationMs
                        )
                    )
                );

                payInfo.payerHasAdded = true;
                await this.payRepository.save(payInfo);

            } catch (error) {
                console.error('资产添加失败:', error);
                payInfo.payerHasAdded = false;
                await this.payRepository.save(payInfo);
                return 'failure';
            }

            return 'success';
        } else {
            // 签名验证失败，记录日志或采取其他措施
            console.error('签名不合法');
            return 'failure';
        }
    }

    // 主动查询支付结果
    public async queryPaymentStatus(payerTradeId: string): Promise<object> {
        console.log("payerTradeId: ", payerTradeId)
        console.log("是否支付成功:", await this.elementExist('payerTradeId', payerTradeId));
        if (await this.elementExist('payerTradeId', payerTradeId)) {
            return {
                isSuccess: true,
                message: "用户已成功支付",
                data: await this.elementExist('payerTradeId', payerTradeId)
            }
        } else {
            return {
                isSuccess: false,
                message: "用户尚未成功支付"
            }
        }
    }

    // 获取支付记录
    async getPayInfos(payerId: number) {
        let payListToGet: any = {};
        payListToGet = await this.payRepository.find({ where: { payerId } });
        console.log("payListToGet: ", JSON.stringify(payListToGet[0]));
        return { isSuccess: true, message: '获取支付记录成功', data: payListToGet };
    }

    private parseShopContent(contents: ShopItemContent[]): PaymentAssets {
        return contents.reduce((acc, item) => {
            const durationMs = item.expirationTime === -1
                ? 10 * 365 * 86400 * 1000
                : item.expirationTime;

            switch (item.type.toLowerCase()) {
                case 'points':
                    acc.points = {
                        amount: Number(item.value),
                        durationMs
                    };
                    break;
                case 'vip':
                    acc.membership = {
                        level: Number(item.value),
                        durationMs
                    };
                    break;
                case 'function':
                    acc.features.push({
                        name: item.value.toString(),
                        durationMs
                    });
                    break;
            }
            return acc;
        }, { features: [] } as PaymentAssets);
    }
}
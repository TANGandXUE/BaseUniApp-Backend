import { Injectable, Logger } from '@nestjs/common';
import Dysmsapi, { SendSmsRequest, QuerySendDetailsRequest } from '@alicloud/dysmsapi20170525';
import Dm20151123, { SingleSendMailRequest } from '@alicloud/dm20151123'; // 引入邮件服务模块
import * as OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import * as dotenv from 'dotenv';
dotenv.config();
import { SqlService } from 'src/module/sql/service/sql/sql.service';

@Injectable()
export class AlimsgService {
    private dysmsapiClient: Dysmsapi;
    private dmClient: Dm20151123;

    constructor(
        private readonly sqlService: SqlService,
    ) {
        const accessKeyId = process.env.SMS_ACCESS_KEY_ID;
        const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET;

        const phoneSmsConfig = new OpenApi.Config({});
        phoneSmsConfig.accessKeyId = accessKeyId;
        phoneSmsConfig.accessKeySecret = accessKeySecret;

        const emailSmsConfig = new OpenApi.Config({});
        emailSmsConfig.accessKeyId = accessKeyId;
        emailSmsConfig.accessKeySecret = accessKeySecret;
        emailSmsConfig.endpoint = `dm.aliyuncs.com`;

        this.dysmsapiClient = new Dysmsapi(phoneSmsConfig);
        this.dmClient = new Dm20151123(emailSmsConfig);

    }

    // 发送手机验证码
    async sendPhoneMsg(userPhone: string, signName: string, templateCode: string): Promise<{ isSend: boolean, randomCode: number, userPhoneOrEmail: string }> {
        // 是否发送
        let isSend = false;

        // 生成一个六位随机数
        const randomCode = Math.floor(Math.random() * 900000) + 100000;

        try {
            // 1. 发送短信
            const sendReq = new SendSmsRequest({
                phoneNumbers: userPhone,
                signName,
                templateCode,
                templateParam: `{"code": ${'' + randomCode}}`
            });
            const sendResp = await this.dysmsapiClient.sendSms(sendReq);
            const code = sendResp.body.code;
            if (code !== 'OK') {
                console.error(`错误信息: ${sendResp.body.message}`);
                isSend = false;
                return { isSend, randomCode, userPhoneOrEmail: userPhone };
            }

            const bizId = sendResp.body.bizId;
            console.log(`等待阿里云返回短信发送结果: ${bizId}`);

            // 初始化查询计数器和定时器ID
            let queryCount = 0;
            const maxQueries = Number(process.env.SMS_MAX_QUERIES) || 10; // 最多查询10次，即10秒
            let timeoutId: NodeJS.Timeout;

            // 使用Promise来处理查询逻辑
            return new Promise((resolve, reject) => {
                const querySmsStatus = async () => {
                    const phoneNums = userPhone.split(',');
                    const now = new Date();
                    const sendDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

                    for (const phoneNum of phoneNums) {
                        const queryReq = new QuerySendDetailsRequest({
                            phoneNumber: phoneNum,
                            bizId,
                            sendDate,
                            pageSize: 10,
                            currentPage: 1,
                        });
                        const queryResp = await this.dysmsapiClient.querySendDetails(queryReq);
                        const dtos: any = queryResp.body.smsSendDetailDTOs.smsSendDetailDTO || [];

                        for (const dto of dtos) {
                            if (dto.sendStatus === 3) {
                                console.log(`${dto.phoneNum} 发送成功，接收时间: ${dto.receiveDate}`);
                                isSend = true;
                                clearTimeout(timeoutId); // 结果已获取，清除定时器
                                resolve({ isSend, randomCode, userPhoneOrEmail: userPhone });
                                return; // 直接返回结果，避免继续查询
                            } else if (dto.sendStatus === 2) {
                                console.log(`${dto.phoneNum} 发送失败`);
                                isSend = false;
                                clearTimeout(timeoutId); // 结果已获取，清除定时器
                                resolve({ isSend, randomCode, userPhoneOrEmail: userPhone });
                                return; // 直接返回结果，避免继续查询
                            }
                        }
                    }

                    // 如果没有找到结果且未超时，则递归调用自身
                    if (queryCount < maxQueries) {
                        queryCount++;
                        timeoutId = setTimeout(querySmsStatus.bind(this), 1000); // 每隔1秒查询一次
                    } else {
                        console.log("查询发送状态超时，发送失败");
                        clearTimeout(timeoutId);
                        resolve({ isSend, randomCode, userPhoneOrEmail: userPhone }); // 超时后返回结果
                    }
                };

                // 开始查询
                querySmsStatus();
            });

        } catch (error) {
            console.error('发送或查询短信时发生错误', error);
            isSend = false;
            return { isSend, randomCode, userPhoneOrEmail: userPhone };
        }
    }


    // 新增发送邮件验证码方法
    async sendEmailCode(userEmail: string): Promise<{ isSend: boolean, randomCode: number, userPhoneOrEmail: string }> {

        // 生成一个六位随机数
        const randomCode = Math.floor(Math.random() * 900000) + 100000;

        try {
            const singleSendMailRequest = new SingleSendMailRequest({
                accountName: 'tangandxue@dm.tangandxue.com',
                addressType: 1,
                replyToAddress: true,
                toAddress: userEmail,
                subject: "智绘万象注册验证码",
                textBody: `您的验证码为${randomCode}，请尽快注册`,
            });

            const runtime = new $Util.RuntimeOptions({});
            const response = await this.dmClient.singleSendMailWithOptions(singleSendMailRequest, runtime);
            console.log(response);

            if (response && response.statusCode === 200) {
                return { isSend: true, randomCode, userPhoneOrEmail: userEmail };
            } else {
                Logger.warn(`发送邮件失败: ${response}`);
                return { isSend: false, randomCode, userPhoneOrEmail: userEmail };
            }
        } catch (error) {
            Logger.error('发送邮件时发生错误:', error);
            return { isSend: false, randomCode, userPhoneOrEmail: userEmail };
        }
    }

    // 分析源数据类型，执行不同的验证码发送逻辑
    async smsService(userPhoneOrEmail: string, signName: string, templateCode: string)
        : Promise<{ isSend: boolean, randomCode: number }> {
        // 正则表达式用于匹配邮箱和手机号
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^1[3-9]\d{9}$/;

        if (emailPattern.test(userPhoneOrEmail)) {
            // 执行邮箱验证码发送逻辑
            return await this.sendEmailCode(userPhoneOrEmail);
        } else if (phonePattern.test(userPhoneOrEmail)) {
            // 执行手机号验证码发送逻辑
            return await this.sendPhoneMsg(userPhoneOrEmail, signName, templateCode);
        } else {
            // 不符合邮箱或手机号的情况
            return { isSend: false, randomCode: 123456 }
        }
    }

    // 分析源数据类型，执行不同的验证码发送逻辑
    async smsServiceWithValidate(userPhoneOrEmail: string, signName: string, templateCode: string)
        : Promise<any> {
        // 正则表达式用于匹配邮箱和手机号
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^1[3-9]\d{9}$/;

        if (emailPattern.test(userPhoneOrEmail)) {
            // 执行邮箱验证码发送逻辑
            if (!await this.sqlService.elementExist('userEmail', userPhoneOrEmail)) {
                return { isSend: false, message: '邮箱与该账号不匹配' }
            } else {
                return await this.sendEmailCode(userPhoneOrEmail);
            }
        } else if (phonePattern.test(userPhoneOrEmail)) {
            // 执行手机号验证码发送逻辑
            if (!await this.sqlService.elementExist('userPhone', userPhoneOrEmail)) {
                return { isSend: false, message: '手机号与该账号不匹配' }
            } else {
                return await this.sendPhoneMsg(userPhoneOrEmail, signName, templateCode);
            }
        } else {
            // 不符合邮箱或手机号的情况
            return { isSend: false, message: '请输入正确的邮箱/手机号' }
        }
    }

}
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WechatOfficial } from 'src/entities/bindAccounts/wechatOfficial.entity';
import { firstValueFrom } from 'rxjs';
import { CookieManagerService } from '../cookie/cookie-manager.service';

interface WechatResponse {
    base_resp: {
        err_msg: string;
        ret: number;
    };
    status?: number;
    uuid?: string;
    nickname?: string;
    avatar?: string;
    fakeid?: string;
    token?: string;
    expires?: string;
}

@Injectable()
export class BindAccountsService {
    private readonly baseUrl: string;
    private readonly defaultHeaders: any;
    private scanRetryCount: Map<string, number> = new Map();

    constructor(
        private readonly httpService: HttpService,
        private readonly cookieManager: CookieManagerService,
        @InjectRepository(WechatOfficial)
        private wechatOfficialRepository: Repository<WechatOfficial>,
    ) {
        const baseUrl = process.env.WECHAT_ARTICLE_EXPORTER_SERVICE_URL || 'http://localhost:3000';
        this.baseUrl = baseUrl.replace('127.0.0.1', 'localhost');

        this.defaultHeaders = {
            'Referer': 'https://mp.weixin.qq.com/',
            'Origin': 'https://mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        };

        this.httpService.axiosRef.defaults.timeout = 30000;
    }

    // 生成会话ID
    private generateSessionId(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${timestamp}${random}`;
    }

    // 创建登录会话
    private async createSession(sessionId: string): Promise<any> {
        try {
            console.log('正在创建会话，URL:', `${this.baseUrl}/api/login/session/${sessionId}`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/login/session/${sessionId}`, null, {
                    headers: {
                        ...this.defaultHeaders,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
            );

            // 保存Cookie
            this.cookieManager.updateCookies(sessionId, response);
            console.log('服务器响应:', response.data);

            if (response.data.base_resp.ret === 0) {
                return {
                    isSuccess: true,
                    message: "会话创建成功",
                    data: { sessionId }
                };
            }

            throw new HttpException({
                isSuccess: false,
                message: "会话创建失败",
                data: response.data.base_resp
            }, HttpStatus.BAD_REQUEST);
        } catch (error) {
            console.error('创建会话失败:', error.message);
            if (error.response) {
                console.error('服务器响应:', error.response.data);
            }
            return {
                isSuccess: false,
                message: "会话创建失败",
                data: error.message
            };
        }
    }

    // 获取二维码
    private async getQRCode(sessionId: string): Promise<any> {
        try {
            console.log('正在获取二维码，URL:', `${this.baseUrl}/api/login/getqrcode`);
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.baseUrl}/api/login/getqrcode?rnd=${Math.random()}`,
                    {
                        responseType: 'arraybuffer',
                        headers: {
                            ...this.defaultHeaders,
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            'Cookie': this.cookieManager.getCookieHeader(sessionId)
                        }
                    }
                )
            );

            // 更新Cookie
            this.cookieManager.updateCookies(sessionId, response);

            console.log('二维码响应头:', response.headers);
            console.log('二维码响应数据长度:', response.data.length);
            console.log('二维码响应类型:', response.headers['content-type']);

            if (response.headers['logicret'] !== '0') {
                throw new Error(`请求被拒绝: logicret=${response.headers['logicret']}, retkey=${response.headers['retkey']}`);
            }

            if (!response.data || response.data.length === 0) {
                throw new Error('获取到的二维码数据为空');
            }

            const qrcodeBase64 = Buffer.from(response.data).toString('base64');

            return {
                isSuccess: true,
                message: "二维码获取成功",
                data: {
                    qrcode: qrcodeBase64
                }
            };
        } catch (error) {
            console.error('获取二维码失败:', error.message);
            if (error.response) {
                console.error('二维码响应状态:', error.response.status);
                console.error('二维码响应头:', error.response.headers);
                if (typeof error.response.data === 'string') {
                    console.error('二维码响应数据:', error.response.data);
                } else {
                    console.error('二维码响应数据(Buffer)长度:', error.response.data?.length);
                }
            }
            return {
                isSuccess: false,
                message: "二维码获取失败: " + error.message,
                data: null
            };
        }
    }

    // 添加状态字符串到数字的映射
    private getStatusNumber(status: string): number {
        const statusMap = {
            'binding': 0,    // 初始状态，等同于等待扫码
            'waiting': 0,    // 等待扫码
            'scanned': 4,    // 已扫码等待确认
            'authorizing': 1, // 授权中（单账号）
            'bound': 2,      // 已绑定
            'failed': -1,    // 失败状态
            'unbind': -2     // 解绑状态
        };
        return statusMap[status] ?? -1;
    }

    // 修改状态转换验证逻辑
    private isValidStateTransition(fromState: string | number, toState: number): boolean {
        // 如果是字符串状态，转换为数字
        const fromStateNum = typeof fromState === 'string' ? this.getStatusNumber(fromState) : fromState;

        // 定义允许的状态转换
        const validTransitions = {
            0: [0, 4, 5, 6],        // 等待扫码 -> 继续等待/已扫码等待确认/二维码过期/加载失败
            4: [1, 2, 3, 4, 6, 7],  // 已扫码等待确认 -> 授权成功(单账号)/授权成功(多账号)/无可用账号/继续等待确认/用户取消/需绑定邮箱
            1: [],                  // 终态
            2: [],                  // 终态
            3: [],                  // 终态
            5: [],                  // 终态
            6: [],                  // 终态
            7: [],                  // 终态
            [-1]: [],              // 失败状态
            [-2]: []               // 解绑状态
        };

        // 检查是否是有效的转换
        const isValid = validTransitions[fromStateNum]?.includes(toState) ?? false;
        
        console.log('状态转换验证:', {
            from: `${fromState}(${this.getStateDescription(fromStateNum)})`,
            to: `${toState}(${this.getStateDescription(toState)})`,
            isValid
        });

        return isValid;
    }

    // 添加状态描述函数
    private getStateDescription(state: number): string {
        const stateMap = {
            0: '等待扫码',
            1: '扫码成功且已授权（单账号）',
            2: '扫码成功且已授权（多账号）',
            3: '没有可用账号',
            4: '已扫码等待确认',
            5: '二维码已过期',
            6: '二维码加载失败',
            7: 'QQ号需要绑定邮箱'
        };
        return stateMap[state] || '未知状态';
    }

    // 重置重试计数
    private resetRetryCount(sessionId: string) {
        this.scanRetryCount.delete(sessionId);
    }

    // 增加重试计数
    private incrementRetryCount(sessionId: string): number {
        const count = (this.scanRetryCount.get(sessionId) || 0) + 1;
        this.scanRetryCount.set(sessionId, count);
        return count;
    }

    // 查询扫码状态
    private async queryScanStatus(sessionId: string): Promise<any> {
        try {
            // 获取绑定记录
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: { wechatOfficialSessionId: sessionId }
            });

            if (!bindingRecord) {
                throw new Error('找不到绑定记录');
            }

            // 检查Cookie是否有效
            if (!this.cookieManager.isCookieValid(sessionId)) {
                console.log('会话Cookie已失效，需要重新开始绑定流程');
                return await this.handleStatusChange(bindingRecord, 'failed', '会话已失效，请重新开始绑定流程', '会话Cookie已失效');
            }

            // 计算剩余时间
            const remainingTime = this.calculateRemainingTime(bindingRecord.wechatOfficialSessionCreateTime);

            // 检查会话是否过期
            if (remainingTime <= 0) {
                console.log('会话已过期');
                return await this.handleStatusChange(bindingRecord, 'failed', '会话已过期', '会话已过期');
            }

            // 获取当前扫码状态
            console.log('开始查询扫码状态，当前Cookie:', this.cookieManager.getCookieHeader(sessionId));
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/login/scan`, {
                    headers: {
                        ...this.defaultHeaders,
                        'Accept': 'application/json',
                        'Cookie': this.cookieManager.getCookieHeader(sessionId)
                    }
                })
            );

            // 更新Cookie
            this.cookieManager.updateCookies(sessionId, response);

            // 再次检查Cookie是否有效
            if (!this.cookieManager.isCookieValid(sessionId)) {
                console.log('扫码状态检查后Cookie已失效');
                return await this.handleStatusChange(bindingRecord, 'failed', '会话已失效，请重新开始绑定流程', '会话Cookie已失效');
            }

            const { data } = response;
            console.log('获取到的扫码状态:', {
                status: data.status,
                statusDesc: this.getStateDescription(data.status),
                acct_size: data.acct_size,
                base_resp: data.base_resp
            });

            // 获取上一次的状态
            const lastStatus = bindingRecord.wechatOfficialStatus;
            const currentStatus = data.status;

            // 如果状态不是6，重置重试计数
            if (currentStatus !== 6) {
                this.resetRetryCount(sessionId);
            }

            // 验证状态转换
            if (!this.isValidStateTransition(lastStatus, currentStatus)) {
                console.warn('检测到异常的状态转换:', {
                    from: `${lastStatus}(${this.getStateDescription(this.getStatusNumber(lastStatus))})`,
                    to: `${currentStatus}(${this.getStateDescription(currentStatus)})`,
                    sessionId,
                    acct_size: data.acct_size
                });
                
                // 特殊处理：如果是初始状态或等待扫码状态，允许继续等待
                if ((lastStatus === 'binding' || lastStatus === 'waiting') && currentStatus === 0) {
                    return await this.handleStatusChange(bindingRecord, 'waiting', '等待扫码');
                }
                
                // 如果是从状态4转到状态6，且有可用账号，可能是临时状态
                if (this.getStatusNumber(lastStatus) === 4 && currentStatus === 6 && data.acct_size > 0) {
                    const retryCount = this.incrementRetryCount(sessionId);
                    console.log(`状态6重试次数: ${retryCount}`);
                    
                    // 如果重试次数小于3次，继续等待
                    if (retryCount < 3) {
                        return await this.handleStatusChange(bindingRecord, 'scanned', '已扫码，等待授权');
                    }
                    
                    // 超过重试次数，判定为用户取消
                    return await this.handleStatusChange(bindingRecord, 'failed', '用户取消了操作', '用户取消了操作');
                }
                
                // 其他非法状态转换，可能是会话失效
                return await this.handleStatusChange(bindingRecord, 'failed', '会话状态异常，请重新开始绑定流程', '非法状态转换');
            }

            switch (currentStatus) {
                case 0: // 等待扫码
                    return await this.handleStatusChange(bindingRecord, 'waiting', '等待扫码');

                case 1: // 扫码成功且已授权，可登录账号=1
                case 2: // 扫码成功且已授权，可登录账号>1
                    console.log('检测到授权成功，开始登录...', {
                        status: currentStatus,
                        acct_size: data.acct_size
                    });
                    return await this.bizLogin(bindingRecord);

                case 3: // 没有可登录账号
                    return await this.handleStatusChange(bindingRecord, 'failed', '没有可用的公众号账号', '没有可用的公众号账号');

                case 4: // 已扫码等待确认
                    return await this.handleStatusChange(bindingRecord, 'scanned', '已扫码，等待授权');

                case 5: // 二维码已过期
                    return await this.handleStatusChange(bindingRecord, 'failed', '二维码已过期', '二维码已过期');

                case 6: // 二维码加载失败或用户取消
                    // 如果是已扫码状态，且有可用账号，检查重试次数
                    if (this.getStatusNumber(lastStatus) === 4 && data.acct_size > 0) {
                        const retryCount = this.incrementRetryCount(sessionId);
                        console.log(`状态6重试次数: ${retryCount}`);
                        
                        // 如果重试次数小于3次，继续等待
                        if (retryCount < 3) {
                            return await this.handleStatusChange(bindingRecord, 'scanned', '已扫码，等待授权');
                        }
                        
                        // 超过重试次数，判定为用户取消
                        return await this.handleStatusChange(bindingRecord, 'failed', '用户取消了操作', '用户取消了操作');
                    }
                    return await this.handleStatusChange(bindingRecord, 'failed', '二维码加载失败', '二维码加载失败');

                case 7: // QQ号需要绑定邮箱
                    return await this.handleStatusChange(bindingRecord, 'failed', 'QQ号需要绑定邮箱', 'QQ号需要绑定邮箱');

                default:
                    console.warn('收到未知状态:', currentStatus);
                    return await this.handleStatusChange(bindingRecord, 'failed', '未知状态', `未知状态: ${currentStatus}`);
            }
        } catch (error) {
            console.error('查询扫码状态失败:', error);
            if (error.response) {
                console.error('错误响应:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            return {
                isSuccess: false,
                message: "查询扫码状态失败",
                data: {
                    status: 'failed',
                    errorMessage: error.message
                }
            };
        }
    }

    // 处理绑定状态变更
    private async handleStatusChange(bindingRecord: WechatOfficial, status: string, message: string, errorMessage?: string): Promise<any> {
        console.log('状态变更:', {
            from: bindingRecord.wechatOfficialStatus,
            to: status,
            message,
            errorMessage,
            sessionId: bindingRecord.wechatOfficialSessionId
        });

        // 保存之前的状态用于日志
        const previousStatus = bindingRecord.wechatOfficialStatus;

        // 更新记录
        bindingRecord.wechatOfficialStatus = status;
        bindingRecord.wechatOfficialUpdateTime = new Date();
        if (errorMessage) {
            bindingRecord.wechatOfficialErrorMessage = errorMessage;
        }

        // 保存状态变更
        await this.wechatOfficialRepository.save(bindingRecord);

        // 计算剩余时间
        const remainingTime = this.calculateRemainingTime(bindingRecord.wechatOfficialSessionCreateTime);
        
        // 记录状态变更日志
        console.log('状态变更完成:', {
            previousStatus,
            currentStatus: status,
            remainingTime: Math.max(0, remainingTime),
            message,
            errorMessage,
            sessionId: bindingRecord.wechatOfficialSessionId
        });

        if (status === 'failed') {
            return {
                isSuccess: false,
                message,
                data: {
                    status,
                    errorMessage: errorMessage || message
                }
            };
        }

        if (status === 'bound') {
            return {
                isSuccess: true,
                message,
                data: {
                    status,
                    nickname: bindingRecord.wechatOfficialNickname,
                    avatar: bindingRecord.wechatOfficialAvatar
                }
            };
        }

        return {
            isSuccess: true,
            message,
            data: {
                status,
                remainingTime: Math.max(0, remainingTime)
            }
        };
    }

    // 计算剩余时间
    private calculateRemainingTime(sessionCreateTime: Date): number {
        const now = Date.now();
        const sessionExpireTime = 30 * 60 * 1000; // 30分钟
        return sessionCreateTime.getTime() + sessionExpireTime - now;
    }

    // 执行最终登录
    private async bizLogin(bindingRecord: WechatOfficial): Promise<any> {
        try {
            console.log('开始执行登录...', {
                sessionId: bindingRecord.wechatOfficialSessionId,
                status: bindingRecord.wechatOfficialStatus,
                retryCount: 0
            });

            const cookieHeader = this.cookieManager.getCookieHeader(bindingRecord.wechatOfficialSessionId);
            console.log('登录请求Cookie:', cookieHeader);

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/api/login/bizlogin`,
                    {
                        userlang: 'zh_CN',
                        redirect_url: '',
                        cookie_forbidden: 0,
                        cookie_cleaned: 0,
                        plugin_used: 0,
                        login_type: 3,
                        token: '',
                        lang: 'zh_CN',
                        f: 'json',
                        ajax: 1
                    },
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            Cookie: cookieHeader,
                            'Referer': 'https://mp.weixin.qq.com/'
                        }
                    }
                )
            );

            // 更新Cookie
            this.cookieManager.updateCookies(bindingRecord.wechatOfficialSessionId, response);
            const updatedCookies = this.cookieManager.getCookieHeader(bindingRecord.wechatOfficialSessionId);
            console.log('登录后更新Cookie:', updatedCookies);

            const { data } = response;

            console.log('登录响应数据:', {
                baseResp: data.base_resp,
                hasToken: !!data.token,
                hasRedirectUrl: !!data.redirect_url,
                response: data
            });

            // 检查是否包含用户信息
            if (data.uuid && data.nickname && data.token) {
                console.log('登录成功，获取到用户信息:', {
                    uuid: data.uuid,
                    nickname: data.nickname,
                    avatar: data.avatar,
                    fakeid: data.fakeid
                });

                // 更新用户信息
                bindingRecord.wechatOfficialUuid = data.uuid;
                bindingRecord.wechatOfficialNickname = data.nickname;
                bindingRecord.wechatOfficialAvatar = data.avatar;
                bindingRecord.wechatOfficialFakeid = data.fakeid;
                bindingRecord.wechatOfficialToken = data.token;
                bindingRecord.wechatOfficialCookies = updatedCookies;  // 保存Cookie

                // 解析过期时间
                if (data.expires) {
                    const expiresDate = new Date(data.expires);
                    bindingRecord.wechatOfficialTokenExpires = expiresDate;
                } else {
                    // 如果没有过期时间，默认30分钟
                    bindingRecord.wechatOfficialTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
                }

                // 保存绑定记录
                await this.wechatOfficialRepository.save(bindingRecord);

                return await this.handleStatusChange(bindingRecord, 'bound', '绑定成功');
            }

            // 如果响应中包含错误信息
            if (data.err) {
                console.log('登录失败，服务器返回错误:', data.err);
                return await this.handleStatusChange(bindingRecord, 'failed', data.err, data.err);
            }

            // 检查base_resp
            if (data.base_resp?.ret === 200015) {
                console.log('会话已过期');
                return await this.handleStatusChange(bindingRecord, 'failed', '会话已过期', '会话已过期');
            }

            // 其他错误情况
            const errorMessage = data.base_resp?.err_msg || data.err || '未知错误';
            const errorCode = data.base_resp?.ret || 'undefined';
            const fullErrorMessage = `登录失败: ${errorMessage} (错误码: ${errorCode})`;
            
            console.error('登录失败:', {
                errorMessage: fullErrorMessage,
                response: data,
                sessionId: bindingRecord.wechatOfficialSessionId
            });
            
            return await this.handleStatusChange(bindingRecord, 'failed', fullErrorMessage, fullErrorMessage);

        } catch (error) {
            console.error('登录请求异常:', error);
            const errorMessage = `登录请求失败: ${error.message}`;
            if (error.response) {
                console.error('错误响应:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            return await this.handleStatusChange(bindingRecord, 'failed', errorMessage, errorMessage);
        }
    }

    // 开始绑定流程
    async startBinding(userId: number): Promise<any> {
        try {
            // 检查是否已有绑定记录
            const existingBinding = await this.wechatOfficialRepository.findOne({
                where: { wechatOfficialUserId: userId }
            });

            if (existingBinding && existingBinding.wechatOfficialStatus === 'bound') {
                return {
                    isSuccess: false,
                    message: "该用户已绑定微信公众号",
                    data: null
                };
            }

            // 生成新的会话ID
            const sessionId = this.generateSessionId();

            // 创建或更新绑定记录
            const bindingRecord = existingBinding || new WechatOfficial();
            bindingRecord.wechatOfficialUserId = userId;
            bindingRecord.wechatOfficialSessionId = sessionId;
            bindingRecord.wechatOfficialStatus = 'binding';
            // 设置会话创建时间
            const now = new Date();
            bindingRecord.wechatOfficialSessionCreateTime = now;
            bindingRecord.wechatOfficialUpdateTime = now;
            await this.wechatOfficialRepository.save(bindingRecord);

            // 创建会话
            const sessionResult = await this.createSession(sessionId);
            if (!sessionResult.isSuccess) {
                bindingRecord.wechatOfficialStatus = 'failed';
                bindingRecord.wechatOfficialErrorMessage = sessionResult.message;
                await this.wechatOfficialRepository.save(bindingRecord);
                throw new Error(sessionResult.message);
            }

            // 获取二维码
            const qrcodeResult = await this.getQRCode(sessionId);
            if (!qrcodeResult.isSuccess) {
                bindingRecord.wechatOfficialStatus = 'failed';
                bindingRecord.wechatOfficialErrorMessage = qrcodeResult.message;
                await this.wechatOfficialRepository.save(bindingRecord);
                throw new Error(qrcodeResult.message);
            }

            if (!qrcodeResult.data?.qrcode) {
                bindingRecord.wechatOfficialStatus = 'failed';
                bindingRecord.wechatOfficialErrorMessage = '获取二维码失败：二维码数据为空';
                await this.wechatOfficialRepository.save(bindingRecord);
                throw new Error('获取二维码失败：二维码数据为空');
            }

            return {
                isSuccess: true,
                message: "绑定流程已启动",
                data: {
                    sessionId,
                    qrcode: qrcodeResult.data.qrcode,
                    expireTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString() // 返回过期时间
                }
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: "启动绑定流程失败",
                data: error.message
            };
        }
    }

    // 检查绑定状态
    async checkBindingStatus(userId: number): Promise<any> {
        try {
            // 查找最新的绑定记录
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: { wechatOfficialUserId: userId },
                order: { wechatOfficialUpdateTime: 'DESC' }
            });

            console.log('当前绑定记录:', {
                userId,
                status: bindingRecord?.wechatOfficialStatus,
                sessionId: bindingRecord?.wechatOfficialSessionId,
                updateTime: bindingRecord?.wechatOfficialUpdateTime
            });

            if (!bindingRecord) {
                return {
                    isSuccess: false,
                    message: "未找到绑定记录",
                    data: null
                };
            }

            // 检查会话是否已过期
            const now = new Date();
            const remainingTime = this.calculateRemainingTime(bindingRecord.wechatOfficialSessionCreateTime);
            if (remainingTime <= 0 && bindingRecord.wechatOfficialStatus === 'binding') {
                return await this.handleStatusChange(bindingRecord, 'failed', '会话已过期，请重新开始绑定流程', '会话已过期');
            }

            // 如果状态已经是最终状态，直接返回
            if (!['binding', 'authorizing', 'scanned', 'waiting'].includes(bindingRecord.wechatOfficialStatus)) {
                return await this.handleStatusChange(
                    bindingRecord,
                    bindingRecord.wechatOfficialStatus,
                    bindingRecord.wechatOfficialStatus === 'bound' ? '绑定成功' : (bindingRecord.wechatOfficialErrorMessage || '绑定失败'),
                    bindingRecord.wechatOfficialErrorMessage
                );
            }

            // 如果不是最终状态，开始查询扫码状态
            console.log('开始查询扫码状态...');
            return await this.queryScanStatus(bindingRecord.wechatOfficialSessionId);

        } catch (error) {
            console.error('检查绑定状态失败:', error);
            return {
                isSuccess: false,
                message: "检查绑定状态失败",
                data: error.message
            };
        }
    }

    // 解除绑定
    async unbind(userId: number): Promise<any> {
        try {
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: { wechatOfficialUserId: userId }
            });

            if (!bindingRecord) {
                return {
                    isSuccess: false,
                    message: "未找到绑定记录",
                    data: null
                };
            }

            bindingRecord.wechatOfficialStatus = 'unbind';
            bindingRecord.wechatOfficialToken = null;
            bindingRecord.wechatOfficialTokenExpires = null;
            await this.wechatOfficialRepository.save(bindingRecord);

            return {
                isSuccess: true,
                message: "解除绑定成功",
                data: null
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: "解除绑定失败",
                data: error.message
            };
        }
    }

    // 检查用户是否已绑定微信公众号且未过期
    async checkBindingValid(userId: number): Promise<any> {
        try {
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: {
                    wechatOfficialUserId: userId,
                    wechatOfficialStatus: 'bound'
                }
            });

            if (!bindingRecord) {
                return {
                    isSuccess: true,
                    message: "未绑定微信公众号",
                    data: {
                        isBound: false
                    }
                };
            }

            // 检查token是否过期
            const now = new Date();
            const isValid = bindingRecord.wechatOfficialTokenExpires &&
                bindingRecord.wechatOfficialTokenExpires > now;

            return {
                isSuccess: true,
                message: isValid ? "微信公众号绑定有效" : "微信公众号绑定已过期",
                data: {
                    isBound: isValid,
                    accountInfo: isValid ? {
                        nickname: bindingRecord.wechatOfficialNickname,
                        avatar: bindingRecord.wechatOfficialAvatar,
                        expireTime: bindingRecord.wechatOfficialTokenExpires
                    } : null
                }
            };
        } catch (error) {
            return {
                isSuccess: false,
                message: "检查绑定状态失败",
                data: error.message
            };
        }
    }
}

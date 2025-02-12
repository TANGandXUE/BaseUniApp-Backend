import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WechatOfficial } from 'src/entities/bindAccounts/wechatOfficial.entity';
import { firstValueFrom } from 'rxjs';
import { CookieManagerService } from 'src/module/user/service/cookie/cookie-manager.service';

interface AccountInfo {
    fakeid: string;      // 公众号唯一标识
    nickname: string;    // 公众号名称
    alias: string;       // 微信号
    round_head_img: string;  // 头像地址
    service_type: number;    // 账号类型(0/1:订阅号, 2:服务号)
    signature: string;   // 公众号介绍
}

interface SearchResponse {
    base_resp: {
        ret: number;
        err_msg: string;
    };
    list: AccountInfo[];
    total: number;
}

interface ArticleInfo {
    title: string;       // 文章标题
    link: string;        // 文章链接
    cover: string;       // 封面图片URL
    update_time: number; // 更新时间戳
}

interface PublishPage {
    publish_list: Array<{
        publish_info: string;
    }>;
    total_count: number;
}

@Injectable()
export class WechatArticleExporterService {
    private readonly baseUrl: string;
    private readonly defaultHeaders: any;

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
    }

    // 搜索公众号
    async searchOfficialAccounts(userId: number, keyword: string, begin: number = 0, size: number = 5): Promise<any> {
        try {
            // 1. 获取用户的绑定记录
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: {
                    wechatOfficialUserId: userId,
                    wechatOfficialStatus: 'bound'
                }
            });

            console.log('绑定记录:', {
                userId,
                status: bindingRecord?.wechatOfficialStatus,
                token: bindingRecord?.wechatOfficialToken,
                tokenExpires: bindingRecord?.wechatOfficialTokenExpires,
                sessionId: bindingRecord?.wechatOfficialSessionId,
                hasCookies: !!bindingRecord?.wechatOfficialCookies
            });

            if (!bindingRecord) {
                return {
                    isSuccess: false,
                    message: "请先绑定微信公众号",
                    data: null
                };
            }

            // 2. 检查token是否过期
            const now = new Date();
            if (!bindingRecord.wechatOfficialTokenExpires || bindingRecord.wechatOfficialTokenExpires <= now) {
                return {
                    isSuccess: false,
                    message: "登录已过期，请重新绑定公众号",
                    data: null
                };
            }

            // 使用保存的Cookie
            const cookieHeader = bindingRecord.wechatOfficialCookies || `sessionid=${bindingRecord.wechatOfficialSessionId}`;
            console.log('请求Cookie:', cookieHeader);

            // 构建请求参数
            const requestConfig = {
                params: {
                    keyword,
                    token: bindingRecord.wechatOfficialToken,
                    begin,
                    size
                },
                headers: {
                    ...this.defaultHeaders,
                    'Accept': 'application/json',
                    'Cookie': cookieHeader
                }
            };

            // 输出完整请求信息
            console.log('发起搜索请求:', {
                url: `${this.baseUrl}/api/searchbiz`,
                params: requestConfig.params,
                headers: requestConfig.headers
            });

            // 3. 调用搜索接口
            const response = await firstValueFrom(
                this.httpService.get<SearchResponse>(`${this.baseUrl}/api/searchbiz`, requestConfig)
            );

            // 输出响应信息
            console.log('搜索响应:', {
                status: response.status,
                headers: response.headers,
                data: response.data
            });

            const { data } = response;

            // 4. 处理错误情况
            if (data.base_resp.ret !== 0) {
                const errorMessages = {
                    200002: "无效的搜索参数",
                    200003: "会话已过期，请重新绑定",
                    200013: "搜索频率过高，请稍后再试",
                    200014: "系统错误，请稍后重试",
                    200015: "会话已过期，请重新绑定"
                };

                const errorMessage = errorMessages[data.base_resp.ret] || data.base_resp.err_msg || "搜索失败";
                console.error('搜索失败:', {
                    errorCode: data.base_resp.ret,
                    errorMessage: errorMessage,
                    rawResponse: data
                });

                return {
                    isSuccess: false,
                    message: errorMessage,
                    data: {
                        errorCode: data.base_resp.ret,
                        errorMessage: errorMessage
                    }
                };
            }

            // 5. 返回成功结果
            return {
                isSuccess: true,
                message: "搜索成功",
                data: {
                    list: data.list,
                    total: data.total,
                    hasMore: data.list.length === size
                }
            };

        } catch (error) {
            console.error('搜索公众号失败:', error);
            if (error.response) {
                console.error('错误响应:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            return {
                isSuccess: false,
                message: "搜索公众号失败",
                data: error.message
            };
        }
    }

    // 获取文章列表
    async getArticleList(userId: number, fakeid: string, begin: number = 0, keyword: string = ''): Promise<any> {
        try {
            // 1. 获取用户的绑定记录
            const bindingRecord = await this.wechatOfficialRepository.findOne({
                where: {
                    wechatOfficialUserId: userId,
                    wechatOfficialStatus: 'bound'
                }
            });

            console.log('获取文章列表 - 绑定记录:', {
                userId,
                status: bindingRecord?.wechatOfficialStatus,
                token: bindingRecord?.wechatOfficialToken,
                tokenExpires: bindingRecord?.wechatOfficialTokenExpires,
                hasCookies: !!bindingRecord?.wechatOfficialCookies
            });

            if (!bindingRecord) {
                return {
                    isSuccess: false,
                    message: "请先绑定微信公众号",
                    data: null
                };
            }

            // 2. 检查token是否过期
            const now = new Date();
            if (!bindingRecord.wechatOfficialTokenExpires || bindingRecord.wechatOfficialTokenExpires <= now) {
                return {
                    isSuccess: false,
                    message: "登录已过期，请重新绑定公众号",
                    data: null
                };
            }

            // 构建请求参数
            const requestConfig = {
                params: {
                    id: fakeid,
                    token: bindingRecord.wechatOfficialToken,
                    begin,
                    keyword
                },
                headers: {
                    ...this.defaultHeaders,
                    'Accept': 'application/json',
                    'Cookie': bindingRecord.wechatOfficialCookies
                }
            };

            // 输出请求信息
            console.log('发起获取文章列表请求:', {
                url: `${this.baseUrl}/api/appmsgpublish`,
                params: requestConfig.params,
                headers: requestConfig.headers
            });

            // 3. 调用接口获取文章列表
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/appmsgpublish`, requestConfig)
            );

            const { data } = response;

            // 4. 处理错误情况
            if (data.base_resp.ret !== 0) {
                const errorMessages = {
                    200003: "会话已过期，请重新绑定",
                    200013: "请求频率过高，请稍后再试",
                    200014: "系统错误，请稍后重试"
                };

                const errorMessage = errorMessages[data.base_resp.ret] || data.base_resp.err_msg || "获取文章列表失败";
                console.error('获取文章列表失败:', {
                    errorCode: data.base_resp.ret,
                    errorMessage: errorMessage,
                    rawResponse: data
                });

                return {
                    isSuccess: false,
                    message: errorMessage,
                    data: {
                        errorCode: data.base_resp.ret,
                        errorMessage: errorMessage
                    }
                };
            }

            // 5. 解析文章列表数据
            const publishPage: PublishPage = JSON.parse(data.publish_page);
            const articles: ArticleInfo[] = [];

            for (const item of publishPage.publish_list) {
                try {
                    const publishInfo = JSON.parse(item.publish_info);
                    if (publishInfo.appmsgex && publishInfo.appmsgex.length > 0) {
                        articles.push(...publishInfo.appmsgex);
                    }
                } catch (error) {
                    console.error('解析文章信息失败:', error);
                }
            }

            // 6. 返回成功结果
            return {
                isSuccess: true,
                message: "获取文章列表成功",
                data: {
                    list: articles,
                    total: publishPage.total_count
                }
            };

        } catch (error) {
            console.error('获取文章列表失败:', error);
            if (error.response) {
                console.error('错误响应:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            return {
                isSuccess: false,
                message: "获取文章列表失败",
                data: error.message
            };
        }
    }
}

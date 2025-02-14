import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { WechatArticleExporterService } from '../../service/wechat-article-exporter/wechat-article-exporter.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/wechat-article-exporter')
export class WechatArticleExporterController {
    constructor(private readonly wechatArticleExporterService: WechatArticleExporterService) {}

    // 获取公众号列表
    @Get('official-accounts-list')
    @UseGuards(JwtAuthGuard)
    async searchOfficialAccounts(
        @Req() req: any,
        @Query('keyword') keyword: string,
        @Query('begin') begin?: number
    ) {
        // 参数验证
        if (!keyword) {
            return {
                isSuccess: false,
                message: "搜索关键词不能为空",
                data: null
            };
        }

        // 参数处理
        const beginNum = begin ? parseInt(begin.toString()) : 0;

        // 调用服务
        return await this.wechatArticleExporterService.searchOfficialAccounts(
            req.user.userId,
            keyword,
            beginNum
        );
    }

    // 获取文章列表
    @Get('article-list')
    @UseGuards(JwtAuthGuard)
    async getArticleList(
        @Req() req: any,
        @Query('fakeid') fakeid: string,
        @Query('begin') begin?: number,
        @Query('keyword') keyword?: string
    ) {
        // 参数验证
        if (!fakeid) {
            return {
                isSuccess: false,
                message: "缺少必要参数: fakeid",
                data: null
            };
        }

        // 调用服务获取文章列表
        return await this.wechatArticleExporterService.getArticleList(
            req.user.userId,
            fakeid,
            begin || 0,
            keyword || ''
        );
    }
}

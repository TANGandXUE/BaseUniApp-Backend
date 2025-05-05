import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { HistoryService } from '../../service/history/history.service';


@Controller('sql/history')
export class HistoryController {

    constructor(private readonly historyService: HistoryService) {}

    // 新：根据JWT和相关查询信息获取分页历史记录
    @Post('syncpagedinfos')
    @UseGuards(JwtAuthGuard)
    async syncPagedInfos(@Req() req) {
        console.log('req: ', req.body);
        const result = await this.historyService.getPagedHistoryInfos(
            req.user.userId,            // userId是必然不会变动的信息，所以用UseGuards来从JWT中取出，以从数据库中获取动态信息
            req.body.pageIndex,         // 页码
            req.body.pageSize,          // 每页条目数
            req.body.prop,              // 排序字段
            req.body.order,             // 升降序
            req.body.historyAppIds,     // 应用ID数组（可选）
            req.body.appCategories,     // 应用分类数组（可选）
            req.body.historyStatus,     // 任务状态（可选）：processing, completed, failed
        );
        // console.log('result: ', JSON.stringify(result));
        return result;
    }
}
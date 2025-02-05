import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { ProcessService } from '../../service/process/process.service';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { getApiList } from 'src/others/apiList';
import { paramsForApis } from 'src/others/paramsForApis';

@Controller('api/process')
export class ProcessController {

    constructor(
        private readonly processService: ProcessService,
        private readonly sqlService: SqlService,
    ) { }

    // 查询API List
    @Get('getapilist')
    @UseGuards(JwtAuthGuard)
    getApiList(@Req() req) {
        return getApiList(req.user.userLevel);
    }

    // 发起生成预览图任务
    @Post('preview')
    @UseGuards(JwtAuthGuard)
    async startPreviewProcess(@Req() req) {
        // console.log(req.user);
        return await this.processService.startPreviewProcess(
            req.body.fileInfos_url,
            req.body.text,
            req.user.userId,
            req.body.useApiList,
            req.body.selectedTemplateParams,
            req.user.userLevel,
        )
    }

    // 发起重新生成预览图任务
    @Post('reprocess')
    @UseGuards(JwtAuthGuard)
    async startReprocess(@Req() req) {
        // console.log(req.user);
        return await this.processService.startReprocess(
            req.body.fileInfos_url,
            req.user.userId,
            req.body.useApiList,
            req.body.params,
        )
    }

    // 发起批量修图任务
    @Post('finalprocess')
    @UseGuards(JwtAuthGuard)
    async startFinalProcess(@Req() req) {
        // console.log(req.user);
        return await this.processService.startFinalProcess(
            req.body.fileInfos_url,
            req.user.userId,
            req.body.useApiList,
            req.body.params,
            req.body.text,
        )
    }

    // 查询修图任务
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryProcess(@Req() req) {
        // console.log('啊啊啊啊啊啊啊aaaaa: ', await this.processService.queryProcess(req.body.workId));
        return await this.processService.queryProcess(req.body.workId);
    }

    // 旧：根据JWT获取全部历史记录
    @Get('syncinfos')
    @UseGuards(JwtAuthGuard)
    async syncInfos(@Req() req) {
        // userId是必然不会变动的信息，所以用UseGuards来从JWT中取出，以从数据库中获取动态信息
        const workUserId = req.user.userId;
        return await this.processService.getWorkInfos(workUserId);
    }

    // 新：根据JWT和相关查询信息获取分页历史记录
    @Post('syncpagedinfos')
    @UseGuards(JwtAuthGuard)
    async syncPagedInfos(@Req() req) {
        return await this.processService.getPagedWorkInfos(
            req.user.userId,            // userId是必然不会变动的信息，所以用UseGuards来从JWT中取出，以从数据库中获取动态信息
            req.body.pageIndex,         // 页码
            req.body.pageSize,          // 每页条目数
            req.body.prop,              // 排序字段
            req.body.order,             // 升降序
        );
    }

    // 查询txt2params使用的临时参数
    @Post('queryparams')
    @UseGuards(JwtAuthGuard)
    async queryParams(@Req() req) {
        return await this.processService.queryParams(req.body.workId);
    }

    // 查询txt2params使用的所有参数
    @Get('queryallparams')
    @UseGuards(JwtAuthGuard)
    queryAllParams() {
        return { isSuccess: true, message: '查询txt2params使用的所有参数成功', data: paramsForApis };
    }

    // 判断当前点数够不够完成修图
    @Post('ispointsenough')
    @UseGuards(JwtAuthGuard)
    async isPointsEnough(@Req() req) {

        return await this.sqlService.isPointsEnoughByUserId(req.user.userId, req.body.fileNum);

    }

}

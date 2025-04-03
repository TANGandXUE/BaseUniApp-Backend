import { Controller, Post, Body, Query, Get, UseGuards, Req } from '@nestjs/common';
import { DigitalHumanService } from '../../service/digital-human/digital-human.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { defaultImgList } from 'src/others/app-tools/digital-human/defaultImgList';
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { voiceList } from 'src/others/app-tools/digital-human/voiceList';
import { defaultFigureList } from 'src/others/app-tools/digital-human/defaultFigureList';
import { bgList } from 'src/others/app-tools/digital-human/bgList';
import { advTemplateList } from 'src/others/app-tools/digital-human/advTemplateList';


@Controller('app-tools/digital-human')
export class DigitalHumanController {
    constructor(
        private readonly digitalHumanService: DigitalHumanService,
        private readonly taskRecordsService: TaskRecordsService
    ) { }

    // 图片数字人-提交任务
    @Post('img-start')
    @UseGuards(JwtAuthGuard)
    async img_submitVideoTask(@Body() params: any, @Req() req: any): Promise<any> {
        return await this.digitalHumanService.img_submitVideoTask(params, req.user, 1);
    }

    // 图片数字人-获取任务状态
    @Post('img-query')
    @UseGuards(JwtAuthGuard)
    async img_queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.digitalHumanService.img_queryTaskStatusFromSQL(req.body.taskId, req.user.userId);
    }

    // 精品数字人-提交任务
    @Post('vip-start')
    @UseGuards(JwtAuthGuard)
    async vip_submitVideoTask(@Body() params: any, @Req() req: any): Promise<any> {
        return await this.digitalHumanService.vip_submitVideoTask(params, req.user, 2);
    }

    // 精品数字人-获取任务状态
    @Post('vip-query')
    @UseGuards(JwtAuthGuard)
    async vip_queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.digitalHumanService.vip_queryTaskStatusFromSQL(req.body.taskId, req.user.userId);
    }

    // 高级数字人-提交任务
    @Post('adv-start')
    @UseGuards(JwtAuthGuard)
    async adv_submitVideoTask(@Body() params: any, @Req() req: any): Promise<any> {
        return await this.digitalHumanService.adv_submitVideoTask(params, req.user, 7);
    }

    // 高级数字人-获取任务状态
    @Post('adv-query')
    @UseGuards(JwtAuthGuard)
    async adv_queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.digitalHumanService.adv_queryTaskStatusFromSQL(req.body.taskId, req.user.userId);
    }

    // 123数字人-提交任务
    @Post('123-start')
    @UseGuards(JwtAuthGuard)
    async _123_submitVideoTask(@Body() params: any, @Req() req: any): Promise<any> {
        return await this.digitalHumanService._123_submitVideoTask(params, req.user, 20);
    }

    // 123数字人-获取任务状态
    @Post('123-query')
    @UseGuards(JwtAuthGuard)
    async _123_queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.digitalHumanService._123_queryTaskStatusFromSQL(req.body.taskId, req.user.userId);
    }

    // 高级数字人-获取模板列表
    @Get('adv-template-list')
    adv_template_list() {
        return {
            isSuccess: true,
            message: '获取高级数字人模板列表成功',
            data: advTemplateList
        }
    }

    // 图片数字人-获取默认图片列表
    @Get('img-default-list')
    // @UseGuards(JwtAuthGuard)
    img_defaultList() {
        return {
            isSuccess: true,
            message: '获取默认图片列表成功',
            data: defaultImgList
        }
    }

    // 精品数字人-获取默认数字人列表
    @Get('vip-figure-list')
    vip_figure_list() {
        return {
            isSuccess: true,
            message: '获取默认数字人列表成功',
            data: defaultFigureList
        }
    }

    // 数字人-获取语音列表
    @Get('voice-list')
    voice_list() {
        return {
            isSuccess: true,
            message: '获取语音列表成功',
            data: voiceList
        }
    }

    // 数字人-获取背景列表
    @Get('bg-list')
    bg_list() {
        return {
            isSuccess: true,
            message: '获取背景列表成功',
            data: bgList
        }
    }
}
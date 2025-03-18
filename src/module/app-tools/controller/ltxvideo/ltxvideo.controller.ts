import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { LtxvideoService } from '../../service/ltxvideo/ltxvideo.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/ltxvideo')
export class LtxvideoController {
    constructor(private readonly ltxvideoService: LtxvideoService) { }

    // 提交LTX视频生成任务
    @Post('start')
    @UseGuards(JwtAuthGuard)
    async executeLtxVideo(@Req() req: any): Promise<any> {
        return await this.ltxvideoService.executeLtxVideo(req.body, req.user, 12); // LTX视频工具的 appId 是 12
    }

    // 获取任务状态
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.ltxvideoService.queryTaskStatus(req.body.taskId, req.user.userId);
    }
}
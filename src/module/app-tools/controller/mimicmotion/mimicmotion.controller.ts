import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MimicmotionService } from '../../service/mimicmotion/mimicmotion.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/mimicmotion')
export class MimicmotionController {
    constructor(private readonly mimicmotionService: MimicmotionService) { }

    // 提交MimicMotion任务
    @Post('start')
    @UseGuards(JwtAuthGuard)
    async executeMimicMotion(@Req() req: any): Promise<any> {
        return await this.mimicmotionService.executeMimicMotion(req.body, req.user, 3); // 假设MimicMotion工具的 appId 是 3
    }

    // 获取任务状态
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.mimicmotionService.queryTaskStatus(req.body.taskId, req.user.userId);
    }
}
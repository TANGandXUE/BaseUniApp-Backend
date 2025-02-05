import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FacefusionService } from '../../service/facefusion/facefusion.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/facefusion')
export class FacefusionController {
    constructor(
        private readonly facefusionService: FacefusionService
    ) { }

    // 提交换脸任务
    @Post('start')
    @UseGuards(JwtAuthGuard)
    async submitFaceSwapTask(@Req() req: any): Promise<any> {
        return await this.facefusionService.submitFaceSwapTask(req.body, req.user, 4); // 假设换脸工具的 appId 是 4
    }

    // 获取任务状态
    @Post('query')
    @UseGuards(JwtAuthGuard)
    async queryTaskStatus(@Req() req: any): Promise<any> {
        return await this.facefusionService.queryTaskStatusFromSQL(req.body.taskId, req.user.userId);
    }
}

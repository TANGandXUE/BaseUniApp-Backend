import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { UploadManagerService } from '../../service/upload-manager/upload-manager.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('apps/upload')
export class UploadManagerController {
    constructor(
        private readonly uploadManagerService: UploadManagerService
    ) { }

    // 写入上传文件
    @Post('write')
    @UseGuards(JwtAuthGuard)
    async writeUploadFile(@Req() req: any) {
        // 将用户JWT中携带的userId和请求体中的其他信息组合成上传文件信息
        // 用于保护用户隐私，防止其他用户操作当前用户的上传文件
        const uploadInfo = {
            uploadAppId: req.body.uploadAppId,
            uploadUserId: req.user.userId,
            uploadCategory: req.body.uploadCategory,
            uploadName: req.body.uploadName,
            uploadUrl: req.body.uploadUrl,
            uploadTime: new Date(),
        }
        return await this.uploadManagerService.writeUploadFile(uploadInfo);
    }

    // 删除上传文件
    @Post('delete')
    @UseGuards(JwtAuthGuard)
    async deleteUploadFile(@Req() req: any) {
        return await this.uploadManagerService.deleteUploadFile(req.body.uploadId, req.user.userId);
    }

    // 获取用户全部上传文件列表
    @Post('list-all')
    @UseGuards(JwtAuthGuard)
    async getUploadFilesByUserId(@Req() req: any) {
        return await this.uploadManagerService.getUploadFilesByUserId(req.user.userId);
    }

    // 获取用户当前应用上传文件列表
    @Post('list-app')
    @UseGuards(JwtAuthGuard)
    async getUploadFilesByUserIdAndAppId(@Req() req: any) {
        return await this.uploadManagerService.getUploadFilesByUserIdAndAppId(req.user.userId, req.body.appId);
    }

    // 获取用户当前应用下当前文件类别上传文件列表
    @Post('list-category')
    @UseGuards(JwtAuthGuard)
    async getUploadFilesByUserIdAndAppIdAndCategory(@Req() req: any) {
        return await this.uploadManagerService.getUploadFilesByUserIdAndAppIdAndCategory(req.user.userId, req.body.appId, req.body.category);
    }

    // 获取单个上传文件
    @Post('get')
    @UseGuards(JwtAuthGuard)
    async getUploadFileById(@Req() req: any) {
        return await this.uploadManagerService.getUploadFileById(req.body.uploadId, req.user.userId);
    }
}

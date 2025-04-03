import { Controller, Get, Post, Body, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { UpdateAppService } from '../../service/update-app/update-app.service';
import { AppInfo } from 'src/entities/update-app/appInfo.entity';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('sql/update-app')
export class UpdateAppController {
    constructor(private readonly updateAppService: UpdateAppService) { }

    // 添加APP信息
    @Post('add-app-info')
    @UseGuards(JwtAuthGuard)
    async addAppInfo(@Body() appInfo: AppInfo) {
        return await this.updateAppService.addAppInfo(appInfo);
    }

    // 获取单个APP信息
    @Get('get-app-info')
    async getAppInfo(@Query('version') version: string) {
        if (!version) {
            throw new BadRequestException('版本号不能为空');
        }
        return await this.updateAppService.getAppInfo(version);
    }

    // 获取所有APP信息
    @Get('get-all-app-info')
    async getAllAppInfo() {
        return await this.updateAppService.getAllAppInfo();
    }

    // 获取最新版本APP信息
    @Get('get-latest-app-info')
    async getLatestAppInfo() {
        return await this.updateAppService.getLatestAppInfo();
    }

    // 更新APP信息
    @Post('update-app-info')
    @UseGuards(JwtAuthGuard)
    async updateAppInfo(
        @Body() body: { version: string; updateData: Partial<AppInfo> }
    ) {
        if (!body.version) {
            throw new BadRequestException('版本号不能为空');
        }
        return await this.updateAppService.updateAppInfo(body.version, body.updateData);
    }

    // 删除APP信息
    @Post('delete-app-info')
    @UseGuards(JwtAuthGuard)
    async deleteAppInfo(@Body() body: { version: string }) {
        if (!body.version) {
            throw new BadRequestException('版本号不能为空');
        }
        return await this.updateAppService.deleteAppInfo(body.version);
    }
}
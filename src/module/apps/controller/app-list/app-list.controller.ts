import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AppListService } from '../../service/app-list/app-list.service';
import { Apps } from 'src/entities/apps.entity';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('apps/app-list')
export class AppListController {
    constructor(private readonly appListService: AppListService) { }

    // 获取公开应用列表
    @Get('public')
    @UseGuards(JwtAuthGuard)
    async getPublicAppList() {
        return this.appListService.getPublicAppList();
    }

    // 新增应用
    @Post('add')
    @UseGuards(JwtAuthGuard)
    async addApp(@Body() app: Apps) {
        return this.appListService.addApp(
            app
        );
    }

    // 修改应用
    @Post('update')
    @UseGuards(JwtAuthGuard)
    async updateApp(@Body() app: Apps) {
        return this.appListService.updateApp(app);
    }
}


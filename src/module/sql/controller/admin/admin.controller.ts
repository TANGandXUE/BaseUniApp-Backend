import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from '../../service/admin/admin.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('sql/admin')
export class AdminController {

    constructor(private readonly adminService: AdminService) { }

    // 获取所有用户信息
    @Get('get-all-user-infos')
    @UseGuards(JwtAuthGuard)
    async getAllUsers() {
        return await this.adminService.getAllUserInfos();
    }

    // 获取单个用户信息
    @Post('get-user-info-by-id')
    @UseGuards(JwtAuthGuard)
    async getUserInfoById(@Req() req) {
        return await this.adminService.getUserInfoById(req.body.userId);
    }

    // 获取分页所有用户信息
    @Post('get-paged-all-user-infos')
    @UseGuards(JwtAuthGuard)
    async getPagedUserInfos(@Req() req) {
        console.log('req: ', req.body);
        const result = await this.adminService.getPagedUserInfos(
            req.body.pageIndex,         // 页码
            req.body.pageSize,          // 每页条目数
            req.body.prop,              // 排序字段
            req.body.order,             // 升降序
        );
        console.log('result: ', JSON.stringify(result));
        return result;
    }

    // 修改单个用户信息
    @Post('update-user-info')
    @UseGuards(JwtAuthGuard)
    async updateUserInfo(@Req() req) {
        console.log('update user info req: ', req.body);
        const result = await this.adminService.updateUserInfo(
            req.body.userId,           // 用户ID
            req.body.updateData        // 要更新的数据
        );
        console.log('update result: ', JSON.stringify(result));
        return result;
    }

    // 获取所有分页支付记录
    @Post('get-paged-all-pay-records')
    @UseGuards(JwtAuthGuard)
    async getPagedPayRecords(@Req() req) {
        console.log('get paged pay records req: ', req.body);
        const result = await this.adminService.getPagedPayRecords(
            req.body.pageIndex,         // 页码
            req.body.pageSize,          // 每页条目数
            req.body.prop,              // 排序字段
            req.body.order,             // 升降序
        );
        console.log('result: ', JSON.stringify(result));
        return result;
    }

    // 获取分页历史记录
    @Post('get-paged-all-history-infos')
    @UseGuards(JwtAuthGuard)
    async getPagedHistoryInfos(@Req() req) {
        console.log('get paged history infos req: ', req.body);
        const result = await this.adminService.getPagedHistoryInfos(
            req.body.pageIndex,         // 页码
            req.body.pageSize,          // 每页条目数
            req.body.prop,              // 排序字段
            req.body.order,             // 升降序
        );
        console.log('result: ', JSON.stringify(result));
        return result;
    }

    // 删除用户
    @Post('delete-user')
    @UseGuards(JwtAuthGuard)
    async deleteUser(@Req() req) {
        return this.adminService.deleteUser(req.body.userId);
    }

    // 新增用户
    @Post('create-user')
    @UseGuards(JwtAuthGuard)
    async createUser(@Req() req) {
        return this.adminService.createUser(req.body.userData);
    }
}

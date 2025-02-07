import { Controller, Request, UseGuards, Get, Post, Render, Req } from '@nestjs/common';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { LoginAuthGuard } from '../../others/auth.guard';
import { JwtAuthGuard } from '../../others/jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';

@Controller('/user/login')
@ApiTags('用户登陆相关')
export class LoginController {

    constructor(
        private readonly sqlService: SqlService,
        private readonly userAssetsService: UserAssetsService
    ) { }

    //默认方法
    @Get()
    @ApiOperation({ summary: '测试用页面' })
    @Render('user/login')
    hello() {
    }

    // 登陆，并获取包含全部payload(userInfo数据库中的所有属性)的JWT
    // 如果数据库对象有更新，必须要去sql.service.ts和jwt.strategy.ts中往payload中新增对应的key，
    // 并前往sql.service.ts中的register方法中新增对应的属性
    @UseGuards(LoginAuthGuard)
    @ApiOperation({ summary: '用户登陆' })
    @Post()
    async login(@Request() req) {
        // 检查并初始化用户资产
        await this.userAssetsService.initUserAssets(req.user.userId);

        //经过LoginAuthGuard调用的auth.strategy.ts后，req中新增了user，并存储了用户信息
        // console.log(' 登录成功', req.user)
        return this.sqlService.login(req.user);
    }

    // 新版，根据JWT获取用户凭证，并从数据库中获取动态信息
    @UseGuards(JwtAuthGuard)
    @Get('syncinfos')
    async syncInfos(@Request() req) {
        // 获取必然不会变动的信息，以用来作为凭据，从数据库中获取动态信息
        return await this.sqlService.getUserInfos(req.user.userId);
    }


}

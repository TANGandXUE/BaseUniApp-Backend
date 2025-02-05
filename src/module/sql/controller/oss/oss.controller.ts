import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OssService } from '../../service/oss/oss.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('sql/oss')
export class OssController {
    constructor(private readonly ossService: OssService) { }

    @Get('getsignature')
    @UseGuards(JwtAuthGuard)
    async getSignature() {
        try {
            const responseData = await this.ossService.getSignature();
            return { isSuccess: true, message: '获取签名成功', data: responseData }
        } catch (error) {
            return { isSuccess: false, message: '获取签名失败', data: error }
        }
    }

    // sql/oss/rename
    @Post('rename')
    @UseGuards(JwtAuthGuard)
    async reNameFileName(@Req() req) {
        console.log('req.body.fileName: ', req.body.fileName);
        console.log('newName: ', await this.ossService.reNameFileName(req.body.fileName));
        return { isSuccess: true, message: '重命名成功', data: await this.ossService.reNameFileName(req.body.fileName) };
    }

}

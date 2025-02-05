import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { BosService } from '../../service/bos/bos.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('sql/bos')
export class BosController {
    constructor(private readonly bosService: BosService) { }

    // @Get('getsignature')
    // @UseGuards(JwtAuthGuard)
    // async getSignature() {
    //     try {
    //         const responseData = await this.bosService.getSignature();
    //         return { 
    //             isSuccess: true, 
    //             message: '获取签名成功', 
    //             data: responseData 
    //         }
    //     } catch (error) {
    //         return { 
    //             isSuccess: false, 
    //             message: '获取签名失败', 
    //             data: error 
    //         }
    //     }
    // }

    @Post('rename')
    @UseGuards(JwtAuthGuard)
    async reNameFileName(@Req() req) {
        try {
            const newName = await this.bosService.reNameFileName(req.body.fileName);
            return { 
                isSuccess: true, 
                message: '重命名成功', 
                data: newName 
            };
        } catch (error) {
            return { 
                isSuccess: false, 
                message: '重命名失败', 
                data: error 
            };
        }
    }
}

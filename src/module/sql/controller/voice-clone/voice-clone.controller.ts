import { Controller, Get, Post, Body, UseGuards, Req, Query, Param, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VoiceCloneService } from '../../service/voice-clone/voice-clone.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInfo } from 'src/entities/userinfo.entity';

@Controller('sql/voice-clone')
export class VoiceCloneController {
    constructor(
        private readonly voiceCloneService: VoiceCloneService,
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>
    ) { }

    /**
     * 检查用户是否为管理员
     */
    private async isUserAdmin(userId: number): Promise<boolean> {
        try {
            const user = await this.userInfoRepository.findOne({ 
                where: { userId }
            });
            
            return user?.userIsAdmin === true;
        } catch (error) {
            console.error('检查管理员权限失败:', error);
            return false;
        }
    }

    // 创建克隆音色
    @Post('create')
    @UseGuards(JwtAuthGuard)
    async createVoice(
        @Body() body: { voiceName: string; prefix: string; audioUrl: string },
        @Req() req: any
    ) {
        if (!body.voiceName || !body.prefix || !body.audioUrl) {
            throw new BadRequestException('缺少必要参数');
        }

        return await this.voiceCloneService.createVoice(
            req.user.userId,
            body.voiceName,
            body.prefix,
            body.audioUrl
        );
    }

    // 获取用户所有克隆音色
    @Get('list')
    @UseGuards(JwtAuthGuard)
    async getUserVoices(@Req() req: any) {
        return await this.voiceCloneService.getUserVoices(req.user.userId);
    }

    // 获取所有用户的所有克隆音色（仅管理员可用）
    @Get('admin/list-all')
    @UseGuards(JwtAuthGuard)
    async getAllUsersVoices(@Req() req: any) {
        // 检查用户是否为管理员
        const isAdmin = await this.isUserAdmin(req.user.userId);
        
        if (!isAdmin) {
            throw new ForbiddenException('权限不足，仅管理员可访问');
        }
        
        return await this.voiceCloneService.getAllUsersVoices();
    }

    // 获取单个克隆音色详情
    @Get('detail/:voiceId')
    @UseGuards(JwtAuthGuard)
    async getVoiceDetail(
        @Param('voiceId') voiceId: string,
        @Req() req: any
    ) {
        if (!voiceId) {
            throw new BadRequestException('缺少音色ID');
        }

        return await this.voiceCloneService.getVoiceDetail(req.user.userId, voiceId);
    }

    // 更新克隆音色
    @Post('update')
    @UseGuards(JwtAuthGuard)
    async updateVoice(
        @Body() body: { voiceId: string; voiceName?: string; audioUrl?: string },
        @Req() req: any
    ) {
        if (!body.voiceId) {
            throw new BadRequestException('缺少音色ID');
        }

        if (!body.voiceName && !body.audioUrl) {
            throw new BadRequestException('至少需要提供一项更新内容');
        }

        return await this.voiceCloneService.updateVoice(
            req.user.userId,
            body.voiceId,
            {
                voiceName: body.voiceName,
                audioUrl: body.audioUrl
            }
        );
    }

    // 删除克隆音色
    @Post('delete')
    @UseGuards(JwtAuthGuard)
    async deleteVoice(
        @Body() body: { voiceId: string },
        @Req() req: any
    ) {
        if (!body.voiceId) {
            throw new BadRequestException('缺少音色ID');
        }

        return await this.voiceCloneService.deleteVoice(req.user.userId, body.voiceId);
    }
}
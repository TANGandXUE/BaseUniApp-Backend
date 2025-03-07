import { Body, Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ApiService } from '../../../service/chat/api/api.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

// 创建API密钥DTO
class CreateApiKeyDto {
    name: string;
    description?: string;
    modelId: string;
    knowledgeBaseIds: string[];
    expiresAt?: Date;
}

// 更新API密钥DTO
class UpdateApiKeyDto {
    apiKeyId: number;
    name?: string;
    description?: string;
    modelId?: string;
    knowledgeBaseIds?: string[];
    enabled?: boolean;
    expiresAt?: Date;
}

@Controller('app-tools/chat/api')
export class ApiController {
    private readonly logger = new Logger(ApiController.name);

    constructor(private readonly apiService: ApiService) { }

    /**
     * 创建新的API密钥
     */
    @Post('create')
    @UseGuards(JwtAuthGuard)
    async createApiKey(@Body() createDto: CreateApiKeyDto, @Req() req: any) {
        this.logger.log(`收到创建API密钥请求: ${JSON.stringify(createDto)}`);

        // 验证必须字段
        if (!createDto.name) {
            return {
                isSuccess: false,
                message: 'API密钥名称不能为空',
                data: null
            };
        }

        if (!createDto.modelId) {
            return {
                isSuccess: false,
                message: '模型ID不能为空',
                data: null
            };
        }

        if (!createDto.knowledgeBaseIds || !Array.isArray(createDto.knowledgeBaseIds)) {
            return {
                isSuccess: false,
                message: '知识库ID列表格式不正确',
                data: null
            };
        }

        // 调用服务创建API密钥
        const result = await this.apiService.createApiKey({
            userId: req.user.userId,
            name: createDto.name,
            description: createDto.description,
            modelId: createDto.modelId,
            knowledgeBaseIds: createDto.knowledgeBaseIds,
            expiresAt: createDto.expiresAt
        });

        return result;
    }

    /**
     * 更新API密钥信息
     */
    @Post('update')
    @UseGuards(JwtAuthGuard)
    async updateApiKey(@Body() updateDto: UpdateApiKeyDto, @Req() req: any) {
        this.logger.log(`收到更新API密钥请求: ${JSON.stringify(updateDto)}`);

        // 验证必须字段
        if (!updateDto.apiKeyId) {
            return {
                isSuccess: false,
                message: 'API密钥ID不能为空',
                data: null
            };
        }

        // 调用服务更新API密钥
        const result = await this.apiService.updateApiKey({
            apiKeyId: updateDto.apiKeyId,
            userId: req.user.userId,
            name: updateDto.name,
            description: updateDto.description,
            modelId: updateDto.modelId,
            knowledgeBaseIds: updateDto.knowledgeBaseIds,
            enabled: updateDto.enabled,
            expiresAt: updateDto.expiresAt
        });

        return result;
    }

    /**
     * 删除API密钥
     */
    @Post('delete')
    @UseGuards(JwtAuthGuard)
    async deleteApiKey(@Body() deleteDto: { apiKeyId: number }, @Req() req: any) {
        this.logger.log(`收到删除API密钥请求: ID=${deleteDto.apiKeyId}`);

        if (!deleteDto.apiKeyId || isNaN(Number(deleteDto.apiKeyId))) {
            return {
                isSuccess: false,
                message: 'API密钥ID格式不正确',
                data: null
            };
        }

        // 调用服务删除API密钥
        const result = await this.apiService.deleteApiKey(deleteDto.apiKeyId, req.user.userId);

        return result;
    }

    /**
     * 获取用户的所有API密钥列表
     */
    @Get('list')
    @UseGuards(JwtAuthGuard)
    async getApiKeysList(@Req() req: any) {
        this.logger.log(`收到获取API密钥列表请求: userId=${req.user.userId}`);

        // 调用服务获取API密钥列表
        const result = await this.apiService.getApiKeysList(req.user.userId);

        return result;
    }
}

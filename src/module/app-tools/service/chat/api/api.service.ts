import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from 'src/entities/apps/chat/apiKey.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiService {
    private readonly logger = new Logger(ApiService.name);

    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
    ) { }

    /**
     * 生成新的API密钥字符串
     */
    private generateApiKey(): string {
        return `so-${crypto.randomBytes(28).toString('hex')}`;
    }

    /**
     * 创建新的API密钥
     */
    async createApiKey(params: {
        userId: number;
        name: string;
        description?: string;
        modelId: string;
        knowledgeBaseIds: string[];
        expiresAt?: Date;
    }) {
        try {
            const apiKey = new ApiKey();
            apiKey.apiKey = this.generateApiKey();
            apiKey.apiKeyUserId = params.userId;
            apiKey.apiKeyName = params.name;
            apiKey.apiKeyDescription = params.description;
            apiKey.apiKeyModelId = params.modelId;
            apiKey.apiKeyKnowledgeBaseIds = params.knowledgeBaseIds;
            apiKey.apiKeyEnabled = true;
            
            if (params.expiresAt) {
                apiKey.apiKeyExpiresAt = params.expiresAt;
            }

            const savedApiKey = await this.apiKeyRepository.save(apiKey);
            
            return {
                isSuccess: true,
                message: '创建API密钥成功',
                data: savedApiKey
            };
        } catch (error) {
            this.logger.error(`创建API密钥失败: ${error.message}`, error.stack);
            return {
                isSuccess: false,
                message: `创建API密钥失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 修改API密钥信息
     */
    async updateApiKey(params: {
        apiKeyId: number;
        userId: number;
        name?: string;
        description?: string;
        modelId?: string;
        knowledgeBaseIds?: string[];
        enabled?: boolean;
        expiresAt?: Date;
    }) {
        try {
            // 查找要修改的API密钥
            const apiKey = await this.apiKeyRepository.findOne({ 
                where: { 
                    apiKeyId: params.apiKeyId,
                    apiKeyUserId: params.userId 
                } 
            });

            if (!apiKey) {
                return {
                    isSuccess: false,
                    message: '未找到指定的API密钥或您没有权限修改',
                    data: null
                };
            }

            // 更新信息
            if (params.name !== undefined) apiKey.apiKeyName = params.name;
            if (params.description !== undefined) apiKey.apiKeyDescription = params.description;
            if (params.modelId !== undefined) apiKey.apiKeyModelId = params.modelId;
            if (params.knowledgeBaseIds !== undefined) apiKey.apiKeyKnowledgeBaseIds = params.knowledgeBaseIds;
            if (params.enabled !== undefined) apiKey.apiKeyEnabled = params.enabled;
            if (params.expiresAt !== undefined) apiKey.apiKeyExpiresAt = params.expiresAt;

            // 保存更新
            const updatedApiKey = await this.apiKeyRepository.save(apiKey);
            
            return {
                isSuccess: true,
                message: '更新API密钥成功',
                data: updatedApiKey
            };
        } catch (error) {
            this.logger.error(`更新API密钥失败: ${error.message}`, error.stack);
            return {
                isSuccess: false,
                message: `更新API密钥失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 删除API密钥
     */
    async deleteApiKey(apiKeyId: number, userId: number) {
        try {
            // 查找要删除的API密钥
            const apiKey = await this.apiKeyRepository.findOne({ 
                where: { 
                    apiKeyId: apiKeyId,
                    apiKeyUserId: userId 
                } 
            });

            if (!apiKey) {
                return {
                    isSuccess: false,
                    message: '未找到指定的API密钥或您没有权限删除',
                    data: null
                };
            }

            // 删除API密钥
            await this.apiKeyRepository.remove(apiKey);
            
            return {
                isSuccess: true,
                message: '删除API密钥成功',
                data: null
            };
        } catch (error) {
            this.logger.error(`删除API密钥失败: ${error.message}`, error.stack);
            return {
                isSuccess: false,
                message: `删除API密钥失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 获取用户的所有API密钥列表
     */
    async getApiKeysList(userId: number) {
        try {
            const apiKeys = await this.apiKeyRepository.find({
                where: { apiKeyUserId: userId },
                order: { apiKeyCreatedAt: 'DESC' }
            });
            
            return {
                isSuccess: true,
                message: '获取API密钥列表成功',
                data: apiKeys
            };
        } catch (error) {
            this.logger.error(`获取API密钥列表失败: ${error.message}`, error.stack);
            return {
                isSuccess: false,
                message: `获取API密钥列表失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 验证API密钥并返回相关信息
     * @param apiKey API密钥
     * @returns API密钥信息或null（如果无效）
     */
    async validateApiKey(apiKey: string) {
        try {
            // 在数据库中查找API密钥
            const apiKeyEntity = await this.apiKeyRepository.findOne({
                where: { apiKey }
            });

            if (!apiKeyEntity) {
                this.logger.warn(`API密钥不存在: ${apiKey.substring(0, 5)}***`);
                return null;
            }

            return apiKeyEntity;
        } catch (error) {
            this.logger.error('验证API密钥时出错:', error);
            return null;
        }
    }

    /**
     * 更新API密钥使用统计
     * @param apiKeyId API密钥ID
     */
    async updateApiKeyUsageStats(apiKeyId: number) {
        try {
            // 更新API密钥使用次数和最后使用时间
            await this.apiKeyRepository.update(
                { apiKeyId },
                {
                    apiKeyUsageCount: () => 'apiKeyUsageCount + 1',
                    apiKeyLastUsedAt: new Date()
                }
            );
            
            this.logger.log(`已更新API密钥(ID: ${apiKeyId})的使用统计`);
        } catch (error) {
            this.logger.error(`更新API密钥(ID: ${apiKeyId})使用统计时出错:`, error);
        }
    }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ClonedVoice } from 'src/entities/userAssetsForDigitalAuman/clonedVoice.entity';

@Injectable()
export class VoiceCloneService {
    constructor(
        @InjectRepository(ClonedVoice)
        private readonly clonedVoiceRepository: Repository<ClonedVoice>
    ) { }

    // API相关配置
    private readonly apiUrl = process.env.DASHSCOPE_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization';
    private readonly apiKey = process.env.DASHSCOPE_API_KEY;

    // 获取API请求头
    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 创建音色（API端）
     */
    private async createVoiceApi(prefix: string, audioUrl: string): Promise<any> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'create_voice',
                        target_model: 'cosyvoice-v1',
                        prefix,
                        url: audioUrl
                    }
                },
                { headers: this.getHeaders() }
            );

            return {
                isSuccess: true,
                message: '创建音色成功',
                data: response.data
            };
        } catch (error) {
            console.error('创建音色API调用失败:', error.response?.data || error.message);
            return {
                isSuccess: false,
                message: `创建音色失败: ${error.response?.data?.message || error.message}`,
                data: null
            };
        }
    }

    /**
     * 查询所有音色（API端）
     */
    private async listVoicesApi(prefix?: string, pageIndex: number = 0, pageSize: number = 10): Promise<any> {
        try {
            const requestBody: any = {
                model: 'voice-enrollment',
                input: {
                    action: 'list_voice',
                    page_index: pageIndex,
                    page_size: pageSize
                }
            };

            // 如果有前缀参数，添加到请求中
            if (prefix) {
                requestBody.input.prefix = prefix;
            }

            const response = await axios.post(
                this.apiUrl,
                requestBody,
                { headers: this.getHeaders() }
            );

            return {
                isSuccess: true,
                message: '获取音色列表成功',
                data: response.data
            };
        } catch (error) {
            console.error('获取音色列表API调用失败:', error.response?.data || error.message);
            return {
                isSuccess: false,
                message: `获取音色列表失败: ${error.response?.data?.message || error.message}`,
                data: null
            };
        }
    }

    /**
     * 查询指定音色（API端）
     */
    private async queryVoiceApi(voiceId: string): Promise<any> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'query_voice',
                        voice_id: voiceId
                    }
                },
                { headers: this.getHeaders() }
            );

            return {
                isSuccess: true,
                message: '查询音色成功',
                data: response.data
            };
        } catch (error) {
            console.error('查询音色API调用失败:', error.response?.data || error.message);
            return {
                isSuccess: false,
                message: `查询音色失败: ${error.response?.data?.message || error.message}`,
                data: null
            };
        }
    }

    /**
     * 更新音色（API端）
     */
    private async updateVoiceApi(voiceId: string, audioUrl: string): Promise<any> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'update_voice',
                        voice_id: voiceId,
                        url: audioUrl
                    }
                },
                { headers: this.getHeaders() }
            );

            return {
                isSuccess: true,
                message: '更新音色成功',
                data: response.data
            };
        } catch (error) {
            console.error('更新音色API调用失败:', error.response?.data || error.message);
            return {
                isSuccess: false,
                message: `更新音色失败: ${error.response?.data?.message || error.message}`,
                data: null
            };
        }
    }

    /**
     * 删除音色（API端）
     */
    private async deleteVoiceApi(voiceId: string): Promise<any> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'delete_voice',
                        voice_id: voiceId
                    }
                },
                { headers: this.getHeaders() }
            );

            return {
                isSuccess: true,
                message: '删除音色成功',
                data: response.data
            };
        } catch (error) {
            console.error('删除音色API调用失败:', error.response?.data || error.message);
            return {
                isSuccess: false,
                message: `删除音色失败: ${error.response?.data?.message || error.message}`,
                data: null
            };
        }
    }

    /**
     * 创建音色（数据库 + API）
     */
    async createVoice(userId: number, voiceName: string, prefix: string, audioUrl: string): Promise<any> {
        try {
            // 调用API创建音色
            const apiResult = await this.createVoiceApi(prefix, audioUrl);

            if (!apiResult.isSuccess) {
                return apiResult;
            }

            const voiceId = apiResult.data.output.voice_id;

            // 将结果保存到数据库
            const clonedVoice = new ClonedVoice();
            clonedVoice.ClonedVoiceId = voiceId;
            clonedVoice.ClonedVoiceUserId = userId;
            clonedVoice.ClonedVoiceName = voiceName;
            clonedVoice.ClonedVoiceCreateTime = new Date();
            clonedVoice.ClonedVoiceUpdateTime = new Date();

            const savedVoice = await this.clonedVoiceRepository.save(clonedVoice);

            return {
                isSuccess: true,
                message: '创建音色成功',
                data: savedVoice
            };
        } catch (error) {
            console.error('创建音色失败:', error);
            return {
                isSuccess: false,
                message: `创建音色失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 获取用户所有音色（数据库）
     */
    async getUserVoices(userId: number): Promise<any> {
        try {
            const voices = await this.clonedVoiceRepository.find({
                where: { ClonedVoiceUserId: userId }
            });

            return {
                isSuccess: true,
                message: '获取用户音色列表成功',
                data: voices
            };
        } catch (error) {
            console.error('获取用户音色列表失败:', error);
            return {
                isSuccess: false,
                message: `获取用户音色列表失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 获取所有用户音色（数据库）- 管理员功能
     */
    async getAllUsersVoices(): Promise<any> {
        try {
            const voices = await this.clonedVoiceRepository.find();

            return {
                isSuccess: true,
                message: '获取所有用户音色列表成功',
                data: voices
            };
        } catch (error) {
            console.error('获取所有用户音色列表失败:', error);
            return {
                isSuccess: false,
                message: `获取所有用户音色列表失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 获取单个音色信息（数据库 + API）
     */
    async getVoiceDetail(userId: number, voiceId: string): Promise<any> {
        try {
            // 从数据库获取音色基本信息
            const voiceInfo = await this.clonedVoiceRepository.findOne({
                where: {
                    ClonedVoiceId: voiceId,
                    ClonedVoiceUserId: userId
                }
            });

            if (!voiceInfo) {
                return {
                    isSuccess: false,
                    message: '音色不存在或不属于当前用户',
                    data: null
                };
            }

            // 从API获取详细信息
            const apiResult = await this.queryVoiceApi(voiceId);

            if (!apiResult.isSuccess) {
                return {
                    isSuccess: true,
                    message: '获取音色信息成功（仅数据库信息，API获取失败）',
                    data: {
                        ...voiceInfo,
                        apiStatus: 'API获取失败',
                        apiDetail: apiResult.message
                    }
                };
            }

            // 合并数据库和API的信息
            return {
                isSuccess: true,
                message: '获取音色信息成功',
                data: {
                    ...voiceInfo,
                    apiDetail: apiResult.data.output
                }
            };
        } catch (error) {
            console.error('获取音色信息失败:', error);
            return {
                isSuccess: false,
                message: `获取音色信息失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 更新音色信息（数据库 + API）
     */
    async updateVoice(userId: number, voiceId: string, updateData: {
        voiceName?: string;
        audioUrl?: string;
    }): Promise<any> {
        try {
            // 检查音色是否存在且属于当前用户
            const voiceInfo = await this.clonedVoiceRepository.findOne({
                where: {
                    ClonedVoiceId: voiceId,
                    ClonedVoiceUserId: userId
                }
            });

            if (!voiceInfo) {
                return {
                    isSuccess: false,
                    message: '音色不存在或不属于当前用户',
                    data: null
                };
            }

            // 如果提供了新的音频URL，需要调用API更新音色
            if (updateData.audioUrl) {
                const apiResult = await this.updateVoiceApi(voiceId, updateData.audioUrl);

                if (!apiResult.isSuccess) {
                    return apiResult;
                }
            }

            // 更新数据库记录
            if (updateData.voiceName) {
                voiceInfo.ClonedVoiceName = updateData.voiceName;
            }

            voiceInfo.ClonedVoiceUpdateTime = new Date();

            const updatedVoice = await this.clonedVoiceRepository.save(voiceInfo);

            return {
                isSuccess: true,
                message: '更新音色成功',
                data: updatedVoice
            };
        } catch (error) {
            console.error('更新音色失败:', error);
            return {
                isSuccess: false,
                message: `更新音色失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 删除音色（数据库 + API）
     */
    async deleteVoice(userId: number, voiceId: string): Promise<any> {
        try {
            // 检查音色是否存在且属于当前用户
            const voiceInfo = await this.clonedVoiceRepository.findOne({
                where: {
                    ClonedVoiceId: voiceId,
                    ClonedVoiceUserId: userId
                }
            });

            if (!voiceInfo) {
                return {
                    isSuccess: false,
                    message: '音色不存在或不属于当前用户',
                    data: null
                };
            }

            // 调用API删除音色
            const apiResult = await this.deleteVoiceApi(voiceId);

            // 即使API删除失败，也继续删除数据库记录
            let dbDeleteResult;
            try {
                dbDeleteResult = await this.clonedVoiceRepository.delete({
                    ClonedVoiceId: voiceId,
                    ClonedVoiceUserId: userId
                });
            } catch (dbError) {
                console.error('删除数据库音色记录失败:', dbError);
                return {
                    isSuccess: false,
                    message: `数据库删除失败: ${dbError.message}`,
                    data: null
                };
            }

            if (!apiResult.isSuccess) {
                return {
                    isSuccess: true,
                    message: '音色在数据库中已删除，但API删除失败',
                    data: {
                        dbResult: dbDeleteResult,
                        apiError: apiResult.message
                    }
                };
            }

            return {
                isSuccess: true,
                message: '删除音色成功',
                data: {
                    dbResult: dbDeleteResult,
                    apiResult: apiResult.data
                }
            };
        } catch (error) {
            console.error('删除音色失败:', error);
            return {
                isSuccess: false,
                message: `删除音色失败: ${error.message}`,
                data: null
            };
        }
    }
}
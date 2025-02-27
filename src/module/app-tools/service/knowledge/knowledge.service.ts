import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledge } from 'src/entities/apps/knowledge/knowledge.entity';

export interface CreateKnowledgeBaseParams {
    userId: number; // 我自己添加的用户ID
    parentId?: string | null;
    type?: 'dataset' | 'folder';
    name: string;
    intro?: string;
    avatar?: string;
    vectorModel?: string;
    agentModel?: string;
}

interface KnowledgeBaseResponse {
    code: number;
    statusText: string;
    message: string;
    data: string;
}

interface KnowledgeBaseDetailResponse {
    code: number;
    statusText: string;
    message: string;
    data: {
        _id: string;
        parentId: string | null;
        teamId: string;
        tmbId: string;
        type: string;
        status: string;
        avatar: string;
        name: string;
        vectorModel: {
            model: string;
            name: string;
            charsPointsPrice: number;
            defaultToken: number;
            maxToken: number;
            weight: number;
        };
        agentModel: {
            model: string;
            name: string;
            maxContext: number;
            maxResponse: number;
            charsPointsPrice: number;
        };
        intro: string;
        permission: string;
        updateTime: string;
        canWrite: boolean;
        isOwner: boolean;
        searchSettings?: {
            searchLimit?: number;
            searchSimilarity?: number;
            searchMode?: string;
            questionOptimization?: boolean;
            questionOptimizationModel?: string;
            questionOptimizationBackground?: string;
        };
    } | null;
}

interface KnowledgeBaseDeleteResponse {
    code: number;
    statusText: string;
    message: string;
    data: null;
}

export interface CreateFileCollectionParams {
    datasetId: string;
    parentId?: string | null;
    trainingType: 'chunk' | 'qa' | 'auto';
    chunkSize?: number;
    chunkSplitter?: string;
    qaPrompt?: string;
    tags?: string[];
    createTime?: string | Date;
    metadata?: Record<string, any>;
}

interface CreateFileCollectionResponse {
    code: number;
    statusText: string;
    message: string;
    data: {
        collectionId: string;
        results: {
            insertLen: number;
            overToken: any[];
            repeat: any[];
            error: any[];
        };
    } | null;
}

export interface GetCollectionListParams {
    offset: number;
    pageSize?: number;
    datasetId: string;
    parentId?: string | null;
    searchText?: string;
}

export interface CollectionPermission {
    value: number;
    isOwner: boolean;
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
}

export interface CollectionItem {
    _id: string;
    parentId: string | null;
    tmbId: string;
    type: string;
    name: string;
    rawLink?: string;
    updateTime: string;
    dataAmount: number;
    trainingAmount: number;
    externalFileId?: string;
    tags?: string[];
    forbid: boolean;
    trainingType: string;
    permission: CollectionPermission;
}

interface GetCollectionListResponse {
    code: number;
    statusText: string;
    message: string;
    data: {
        list: CollectionItem[];
        total: number;
    } | null;
}

export interface CollectionDetail {
    _id: string;
    parentId: string | null;
    teamId: string;
    tmbId: string;
    datasetId: {
        _id: string;
        parentId: string | null;
        teamId: string;
        tmbId: string;
        type: string;
        status: string;
        avatar: string;
        name: string;
        vectorModel: string;
        agentModel: string;
        intro: string;
        permission: string;
        updateTime: string;
    };
    type: string;
    name: string;
    trainingType: string;
    chunkSize: number;
    chunkSplitter: string;
    qaPrompt: string;
    rawTextLength: number;
    hashRawText: string;
    createTime: string;
    updateTime: string;
    canWrite: boolean;
    sourceName: string;
}

interface GetCollectionDetailResponse {
    code: number;
    statusText: string;
    message: string;
    data: CollectionDetail | null;
}

interface DeleteCollectionResponse {
    code: number;
    statusText: string;
    message: string;
    data: null;
}

export interface GetDataListParams {
    offset?: number;
    pageSize?: number;
    collectionId: string;
    searchText?: string;
}

export interface DataIndex {
    defaultIndex: boolean;
    dataId: string;
    text: string;
}

export interface DataItem {
    _id: string;
    datasetId: string;
    collectionId: string;
    q: string;
    a?: string;
    fullTextToken?: string;
    indexes?: DataIndex[];
    updateTime?: string;
    chunkIndex?: number;
}

interface GetDataListResponse {
    code: number;
    statusText: string;
    message: string;
    data: {
        list: DataItem[];
        total: number;
    } | null;
}

export interface DataDetail {
    id: string;
    q: string;
    a: string;
    chunkIndex: number;
    indexes: {
        defaultIndex: boolean;
        type: string;
        dataId: string;
        text: string;
        _id: string;
    }[];
    datasetId: string;
    collectionId: string;
    sourceName: string;
    sourceId: string;
    isOwner: boolean;
    canWrite: boolean;
}

interface GetDataDetailResponse {
    code: number;
    statusText: string;
    message: string;
    data: DataDetail | null;
}

export interface UpdateDataParams {
    dataId: string;
    q?: string; // 并非问题，而是主要数据
    a?: string; // 并非答案，而是辅助数据
    indexes?: {
        dataId?: string;
        defaultIndex?: boolean;
        text: string;
    }[];
}

interface UpdateDataResponse {
    code: number;
    statusText: string;
    message: string;
    data: null;
}

interface DeleteDataResponse {
    code: number;
    statusText: string;
    message: string;
    data: string;
}

export interface SearchTestParams {
    datasetId: string;
    text: string;
    limit?: number;
    similarity?: number;
    searchMode?: 'embedding' | 'fullTextRecall' | 'mixedRecall';
    usingReRank?: boolean;
    datasetSearchUsingExtensionQuery?: boolean;
    datasetSearchExtensionModel?: string;
    datasetSearchExtensionBg?: string;
}

export interface SearchResultItem {
    id: string;
    q: string;
    a: string;
    datasetId: string;
    collectionId: string;
    sourceName: string;
    sourceId: string;
    score: number;
}

interface SearchTestResponse {
    code: number;
    statusText: string;
    message?: string;
    data: SearchResultItem[];
}

// 添加知识库搜索设置参数接口
export interface KnowledgeSearchSettings {
    knowledgeId: string;
    searchLimit?: number;
    searchSimilarity?: number;
    searchMode?: string;
    questionOptimization?: boolean;
    questionOptimizationModel?: string;
    questionOptimizationBackground?: string;
}

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    private readonly apiBaseUrl: string;
    private readonly apiKey: string;

    constructor(
        @InjectRepository(Knowledge)
        private knowledgeRepository: Repository<Knowledge>
    ) {
        this.apiBaseUrl = process.env.FASTGPT_API_BASE_URL || 'https://fastgpt.clouddreamai.com/api';
        this.apiKey = process.env.FASTGPT_API_KEY || '';
    }

    /**
     * 创建一个知识库
     * @param params 创建知识库所需参数
     * @returns 创建的知识库ID
     */
    async createKnowledgeBase(params: CreateKnowledgeBaseParams): Promise<KnowledgeBaseResponse> {
        try {
            this.logger.log(`开始创建知识库: ${params.name}`);

            const response = await axios.post(
                `${this.apiBaseUrl}/core/dataset/create`,
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`知识库创建成功, 返回数据: ${JSON.stringify(response.data)}`);
            
            // 如果创建成功，将知识库信息保存到数据库
            if (response.data.code === 200 && response.data.data) {
                await this.saveKnowledgeToDatabase({
                    KnowledgeId: response.data.data,
                    KnowledgeUserId: params.userId,
                    KnowledgeName: params.name,
                    KnowledgeAvatarUrl: params.avatar || '/default-avatar.png',
                    KnowledgeDescription: params.intro || '',
                });
            }
            
            return response.data;
        } catch (error) {
            this.logger.error(`创建知识库失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '创建知识库失败',
                data: '',
            };
        }
    }

    /**
     * 将知识库信息保存到数据库
     * @param knowledgeData 知识库数据
     */
    private async saveKnowledgeToDatabase(knowledgeData: Partial<Knowledge>): Promise<void> {
        try {
            const knowledge = this.knowledgeRepository.create(knowledgeData);
            await this.knowledgeRepository.save(knowledge);
            this.logger.log(`知识库信息已保存到数据库, ID: ${knowledgeData.KnowledgeId}`);
        } catch (error) {
            this.logger.error(`保存知识库信息到数据库失败: ${error.message}`, error.stack);
            // 这里只记录错误，不影响主流程
        }
    }

    // 根据用户ID获取知识库列表
    async getKnowledgeBaseListByUserId(userId: number): Promise<Knowledge[]> {
        return this.knowledgeRepository.find({ where: { KnowledgeUserId: userId } });
    }

    /**
     * 获取知识库详情
     * @param id 知识库ID
     * @returns 知识库详情
     */
    async getKnowledgeBaseDetail(id: string): Promise<KnowledgeBaseDetailResponse> {
        try {
            this.logger.log(`开始获取知识库详情: ${id}`);

            // 从FastGPT API获取知识库详情
            const response = await axios.get(
                `${this.apiBaseUrl}/core/dataset/detail`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`获取知识库详情成功, 返回数据: ${JSON.stringify(response.data)}`);
            
            // 如果API返回成功，从数据库获取额外字段并合并
            if (response.data.code === 200 && response.data.data) {
                try {
                    // 从数据库查询知识库记录
                    const knowledgeRecord = await this.knowledgeRepository.findOne({
                        where: { KnowledgeId: id }
                    });
                    
                    if (knowledgeRecord) {
                        // 合并额外字段到API返回数据
                        response.data.data.searchSettings = {
                            searchLimit: knowledgeRecord.KnowledgeSearchLimit,
                            searchSimilarity: knowledgeRecord.KnowledgeSearchSimilarity,
                            searchMode: knowledgeRecord.KnowledgeSearchMode,
                            questionOptimization: knowledgeRecord.KnowledgeQuestionOptimization,
                            questionOptimizationModel: knowledgeRecord.KnowledgeQuestionOptimizationModel,
                            questionOptimizationBackground: knowledgeRecord.KnowledgeQuestionOptimizationBackground
                        };
                    }
                } catch (dbError) {
                    this.logger.error(`从数据库获取知识库搜索设置失败: ${dbError.message}`, dbError.stack);
                    // 不影响主流程
                }
            }
            
            return response.data;
        } catch (error) {
            this.logger.error(`获取知识库详情失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '获取知识库详情失败',
                data: null,
            };
        }
    }

    /**
     * 删除知识库
     * @param id 知识库ID
     * @returns 删除结果
     */
    async deleteKnowledgeBase(id: string): Promise<KnowledgeBaseDeleteResponse> {
        try {
            this.logger.log(`开始删除知识库: ${id}`);

            // 调用FastGPT API删除知识库
            const response = await axios.delete(
                `${this.apiBaseUrl}/core/dataset/delete`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`知识库删除成功, 返回数据: ${JSON.stringify(response.data)}`);
            
            // 如果API调用成功，从数据库中删除对应记录
            if (response.data.code === 200) {
                try {
                    await this.knowledgeRepository.delete({ KnowledgeId: id });
                    this.logger.log(`已从数据库中删除知识库记录: ${id}`);
                } catch (dbError) {
                    this.logger.error(`从数据库删除知识库记录失败: ${dbError.message}`, dbError.stack);
                    // 不影响主流程，继续返回API结果
                }
            }
            
            return response.data;
        } catch (error) {
            this.logger.error(`删除知识库失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '删除知识库失败',
                data: null,
            };
        }
    }

    /**
     * 创建文件集合
     * @param file 上传的文件
     * @param params 创建参数
     * @returns 创建结果
     */
    async createFileCollection(
        file: Express.Multer.File,
        params: CreateFileCollectionParams
    ): Promise<CreateFileCollectionResponse> {
        try {
            this.logger.log(`开始创建文件集合，知识库ID: ${params.datasetId}, 文件名: ${file.originalname}`);

            // 创建FormData对象
            const formData = new FormData();
            
            // 添加文件
            const fileBuffer = file.buffer;
            const blob = new Blob([fileBuffer], { type: file.mimetype });
            formData.append('file', blob, file.originalname);
            
            // 添加参数数据
            formData.append('data', JSON.stringify(params));

            // 发送请求
            const response = await axios.post(
                `${this.apiBaseUrl}/core/dataset/collection/create/localFile`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            this.logger.log(`文件集合创建成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`创建文件集合失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '创建文件集合失败',
                data: null,
            };
        }
    }

    /**
     * 获取知识库集合列表
     * @param params 查询参数
     * @returns 集合列表和总数
     */
    async getCollectionList(params: GetCollectionListParams): Promise<GetCollectionListResponse> {
        try {
            this.logger.log(`开始获取知识库集合列表, 知识库ID: ${params.datasetId}`);

            const response = await axios.post(
                `${this.apiBaseUrl}/core/dataset/collection/listV2`,
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`获取知识库集合列表成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`获取知识库集合列表失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '获取知识库集合列表失败',
                data: null,
            };
        }
    }

    /**
     * 获取集合详情
     * @param id 集合ID
     * @returns 集合详情
     */
    async getCollectionDetail(id: string): Promise<GetCollectionDetailResponse> {
        try {
            this.logger.log(`开始获取集合详情: ${id}`);

            const response = await axios.get(
                `${this.apiBaseUrl}/core/dataset/collection/detail`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`获取集合详情成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`获取集合详情失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '获取集合详情失败',
                data: null,
            };
        }
    }

    /**
     * 删除集合
     * @param id 集合ID
     * @returns 删除结果
     */
    async deleteCollection(id: string): Promise<DeleteCollectionResponse> {
        try {
            this.logger.log(`开始删除集合: ${id}`);

            const response = await axios.delete(
                `${this.apiBaseUrl}/core/dataset/collection/delete`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`集合删除成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`删除集合失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '删除集合失败',
                data: null,
            };
        }
    }

    /**
     * 获取知识库数据列表
     * @param params 查询参数
     * @returns 数据列表和总数
     */
    async getDataList(params: GetDataListParams): Promise<GetDataListResponse> {
        try {
            this.logger.log(`开始获取知识库数据列表, 集合ID: ${params.collectionId}`);

            const response = await axios.post(
                `${this.apiBaseUrl}/core/dataset/data/v2/list`,
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`获取知识库数据列表成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`获取知识库数据列表失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '获取知识库数据列表失败',
                data: null,
            };
        }
    }

    /**
     * 获取单条数据详情
     * @param id 数据ID
     * @returns 数据详情
     */
    async getDataDetail(id: string): Promise<GetDataDetailResponse> {
        try {
            this.logger.log(`开始获取数据详情: ${id}`);

            const response = await axios.get(
                `${this.apiBaseUrl}/core/dataset/data/detail`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`获取数据详情成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`获取数据详情失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '获取数据详情失败',
                data: null,
            };
        }
    }

    /**
     * 修改单条数据
     * @param params 修改参数
     * @returns 修改结果
     */
    async updateData(params: UpdateDataParams): Promise<UpdateDataResponse> {
        try {
            this.logger.log(`开始修改数据: ${params.dataId}`);

            const response = await axios.put(
                `${this.apiBaseUrl}/core/dataset/data/update`,
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`修改数据成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`修改数据失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '修改数据失败',
                data: null,
            };
        }
    }

    /**
     * 删除单条数据
     * @param id 数据ID
     * @returns 删除结果
     */
    async deleteData(id: string): Promise<DeleteDataResponse> {
        try {
            this.logger.log(`开始删除数据: ${id}`);

            const response = await axios.delete(
                `${this.apiBaseUrl}/core/dataset/data/delete`,
                {
                    params: { id },
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.logger.log(`删除数据成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`删除数据失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '删除数据失败',
                data: '',
            };
        }
    }

    /**
     * 知识库搜索测试
     * @param params 搜索参数
     * @returns 搜索结果
     */
    async searchTest(params: SearchTestParams): Promise<SearchTestResponse> {
        try {
            this.logger.log(`开始知识库搜索测试, 知识库ID: ${params.datasetId}, 搜索文本: ${params.text}`);

            // 设置默认值
            const searchParams = {
                ...params,
                limit: params.limit || 5000,
                similarity: params.similarity || 0,
                searchMode: params.searchMode || 'embedding',
                usingReRank: params.usingReRank || false,
                datasetSearchUsingExtensionQuery: params.datasetSearchUsingExtensionQuery || false
            };

            const response = await axios.post(
                `${this.apiBaseUrl}/core/dataset/searchTest`,
                searchParams,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`知识库搜索测试成功, 返回数据: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`知识库搜索测试失败: ${error.message}`, error.stack);

            // 构建统一的错误响应格式
            return {
                code: error.response?.status || 500,
                statusText: 'ERROR',
                message: error.message || '知识库搜索测试失败',
                data: [],
            };
        }
    }

    /**
     * 更新知识库搜索设置
     * @param settings 搜索设置参数
     * @returns 更新结果
     */
    async updateKnowledgeSearchSettings(settings: KnowledgeSearchSettings): Promise<boolean> {
        try {
            this.logger.log(`开始更新知识库搜索设置: ${settings.knowledgeId}`);

            // 查找知识库记录
            const knowledge = await this.knowledgeRepository.findOne({ where: { KnowledgeId: settings.knowledgeId } });
            
            if (!knowledge) {
                this.logger.error(`更新失败: 知识库ID ${settings.knowledgeId} 不存在`);
                return false;
            }

            // 更新字段
            if (settings.searchLimit !== undefined) {
                knowledge.KnowledgeSearchLimit = settings.searchLimit;
            }
            if (settings.searchSimilarity !== undefined) {
                knowledge.KnowledgeSearchSimilarity = settings.searchSimilarity;
            }
            if (settings.searchMode !== undefined) {
                knowledge.KnowledgeSearchMode = settings.searchMode;
            }
            if (settings.questionOptimization !== undefined) {
                knowledge.KnowledgeQuestionOptimization = settings.questionOptimization;
            }
            if (settings.questionOptimizationModel !== undefined) {
                knowledge.KnowledgeQuestionOptimizationModel = settings.questionOptimizationModel;
            }
            if (settings.questionOptimizationBackground !== undefined) {
                knowledge.KnowledgeQuestionOptimizationBackground = settings.questionOptimizationBackground;
            }

            // 保存更新
            await this.knowledgeRepository.save(knowledge);
            this.logger.log(`知识库搜索设置更新成功: ${settings.knowledgeId}`);
            return true;
        } catch (error) {
            this.logger.error(`更新知识库搜索设置失败: ${error.message}`, error.stack);
            return false;
        }
    }
}

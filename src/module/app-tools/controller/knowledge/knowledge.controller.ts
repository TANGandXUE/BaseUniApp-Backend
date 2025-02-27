import { Controller, Post, Body, Logger, HttpException, HttpStatus, Get, Query, UseInterceptors, UploadedFile, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService, CreateKnowledgeBaseParams, CreateFileCollectionParams, GetCollectionListParams, GetDataListParams, UpdateDataParams, SearchTestParams, KnowledgeSearchSettings } from '../../service/knowledge/knowledge.service';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';

@Controller('app-tools/knowledge')
export class KnowledgeController {
    private readonly logger = new Logger(KnowledgeController.name);

    constructor(private readonly knowledgeService: KnowledgeService) { }

    /**
     * 创建知识库
     * @param createDto 创建知识库所需参数
     * @returns 创建成功后的知识库ID
     */
    @Post('create-knowledge-base')
    @UseGuards(JwtAuthGuard)
    async createKnowledgeBase(@Body() createDto: CreateKnowledgeBaseParams, @Req() req: any) {
        this.logger.log(`收到创建知识库请求: ${JSON.stringify(createDto)}`);

        // 验证必须字段
        if (!createDto.name) {
            return {
                isSuccess: false,
                message: '知识库名称不能为空',
                data: null
            }
        }

        // 调用服务创建知识库
        const result = await this.knowledgeService.createKnowledgeBase({
            userId: req.user.userId,
            parentId: createDto.parentId,
            type: createDto.type || 'dataset',
            name: createDto.name,
            intro: createDto.intro,
            avatar: createDto.avatar,
            vectorModel: createDto.vectorModel,
            agentModel: createDto.agentModel,
        });

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '创建知识库失败',
                data: null
            }
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '创建知识库成功',
            data: {
                knowledgeBaseId: result.data
            }
        };
    }

    /**
     * 获取知识库列表
     * @param req 请求对象
     * @returns 知识库列表
     */
    @Get('get-knowledge-base-list')
    @UseGuards(JwtAuthGuard)
    async getKnowledgeBaseList(@Req() req: any) {
        this.logger.log(`收到获取知识库列表请求`);

        // 调用服务获取知识库列表
        const result = await this.knowledgeService.getKnowledgeBaseListByUserId(req.user.userId);

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取知识库列表成功',
            data: result
        };
    }

    /**
     * 获取知识库详情
     * @param id 知识库ID
     * @returns 知识库详情
     */
    @Get('get-knowledge-base-detail')
    async getKnowledgeBaseDetail(@Query('id') id: string) {
        this.logger.log(`收到获取知识库详情请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            }
        }

        // 调用服务获取知识库详情
        const result = await this.knowledgeService.getKnowledgeBaseDetail(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '获取知识库详情失败',
                data: null
            }
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取知识库详情成功',
            data: result.data
        };
    }

    /**
     * 删除知识库
     * @param id 知识库ID
     * @returns 删除结果
     */
    @Post('delete-knowledge-base')
    async deleteKnowledgeBase(@Body('id') id: string) {
        this.logger.log(`收到删除知识库请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            }
        }

        // 调用服务删除知识库
        const result = await this.knowledgeService.deleteKnowledgeBase(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '删除知识库失败',
                data: null
            }
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '删除知识库成功',
            data: null
        };
    }

    /**
     * 创建文件集合
     * @param file 上传的文件
     * @param createDto 创建参数
     * @returns 创建结果
     */
    @Post('create-file-collection')
    @UseInterceptors(FileInterceptor('file'))
    async createFileCollection(
        @UploadedFile() file: Express.Multer.File,
        @Body() createDto: { data: string }
    ) {
        this.logger.log(`收到创建文件集合请求, 文件名: ${file.originalname}`);

        // 解析data字符串为JSON对象
        let params: CreateFileCollectionParams;
        try {
            params = JSON.parse(createDto.data);
        } catch (error) {
            return {
                isSuccess: false,
                message: '参数格式错误',
                data: null
            };
        }

        // 验证必须字段
        if (!params.datasetId) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            };
        }
        
        if (!params.trainingType) {
            return {
                isSuccess: false,
                message: '训练模式不能为空',
                data: null
            };
        }

        // 调用服务创建文件集合
        const result = await this.knowledgeService.createFileCollection(file, params);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '创建文件集合失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '创建文件集合成功',
            data: result.data
        };
    }

    /**
     * 获取知识库集合列表
     * @param queryDto 查询参数
     * @returns 集合列表和总数
     */
    @Post('get-collection-list')
    async getCollectionList(@Body() queryDto: GetCollectionListParams) {
        this.logger.log(`收到获取知识库集合列表请求: ${JSON.stringify(queryDto)}`);

        // 验证必须字段
        if (!queryDto.datasetId) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            };
        }

        // 设置默认值
        if (queryDto.offset === undefined) {
            queryDto.offset = 0;
        }
        
        if (!queryDto.pageSize) {
            queryDto.pageSize = 10;
        }

        // 调用服务获取集合列表
        const result = await this.knowledgeService.getCollectionList(queryDto);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '获取知识库集合列表失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取知识库集合列表成功',
            data: result.data
        };
    }

    /**
     * 获取集合详情
     * @param id 集合ID
     * @returns 集合详情
     */
    @Get('get-collection-detail')
    async getCollectionDetail(@Query('id') id: string) {
        this.logger.log(`收到获取集合详情请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '集合ID不能为空',
                data: null
            };
        }

        // 调用服务获取集合详情
        const result = await this.knowledgeService.getCollectionDetail(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '获取集合详情失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取集合详情成功',
            data: result.data
        };
    }

    /**
     * 删除集合
     * @param id 集合ID
     * @returns 删除结果
     */
    @Post('delete-collection')
    async deleteCollection(@Body('id') id: string) {
        this.logger.log(`收到删除集合请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '集合ID不能为空',
                data: null
            };
        }

        // 调用服务删除集合
        const result = await this.knowledgeService.deleteCollection(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '删除集合失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '删除集合成功',
            data: null
        };
    }

    /**
     * 获取知识库数据列表
     * @param queryDto 查询参数
     * @returns 数据列表和总数
     */
    @Post('get-data-list')
    async getDataList(@Body() queryDto: GetDataListParams) {
        this.logger.log(`收到获取知识库数据列表请求: ${JSON.stringify(queryDto)}`);

        // 验证必须字段
        if (!queryDto.collectionId) {
            return {
                isSuccess: false,
                message: '集合ID不能为空',
                data: null
            };
        }

        // 设置默认值
        if (queryDto.offset === undefined) {
            queryDto.offset = 0;
        }
        
        if (!queryDto.pageSize) {
            queryDto.pageSize = 10;
        }

        // 调用服务获取数据列表
        const result = await this.knowledgeService.getDataList(queryDto);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '获取知识库数据列表失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取知识库数据列表成功',
            data: result.data
        };
    }

    /**
     * 获取单条数据详情
     * @param id 数据ID
     * @returns 数据详情
     */
    @Get('get-data-detail')
    async getDataDetail(@Query('id') id: string) {
        this.logger.log(`收到获取数据详情请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '数据ID不能为空',
                data: null
            };
        }

        // 调用服务获取数据详情
        const result = await this.knowledgeService.getDataDetail(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '获取数据详情失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '获取数据详情成功',
            data: result.data
        };
    }

    /**
     * 修改单条数据
     * @param updateDto 修改参数
     * @returns 修改结果
     */
    @Post('update-data')
    async updateData(@Body() updateDto: UpdateDataParams) {
        this.logger.log(`收到修改数据请求: ${JSON.stringify(updateDto)}`);

        // 验证必须字段
        if (!updateDto.dataId) {
            return {
                isSuccess: false,
                message: '数据ID不能为空',
                data: null
            };
        }

        // 调用服务修改数据
        const result = await this.knowledgeService.updateData(updateDto);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '修改数据失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '修改数据成功',
            data: null
        };
    }

    /**
     * 删除单条数据
     * @param id 数据ID
     * @returns 删除结果
     */
    @Post('delete-data')
    async deleteData(@Body('id') id: string) {
        this.logger.log(`收到删除数据请求: id=${id}`);

        // 验证必须字段
        if (!id) {
            return {
                isSuccess: false,
                message: '数据ID不能为空',
                data: null
            };
        }

        // 调用服务删除数据
        const result = await this.knowledgeService.deleteData(id);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '删除数据失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '删除数据成功',
            data: null
        };
    }

    /**
     * 知识库搜索测试
     * @param searchDto 搜索参数
     * @returns 搜索结果
     */
    @Post('search-test')
    async searchTest(@Body() searchDto: SearchTestParams) {
        this.logger.log(`收到知识库搜索测试请求: ${JSON.stringify(searchDto)}`);

        // 验证必须字段
        if (!searchDto.datasetId) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            };
        }
        
        if (!searchDto.text) {
            return {
                isSuccess: false,
                message: '搜索文本不能为空',
                data: null
            };
        }

        // 调用服务进行搜索测试
        const result = await this.knowledgeService.searchTest(searchDto);

        // 处理响应结果
        if (result.code !== 200) {
            return {
                isSuccess: false,
                message: result.message || '知识库搜索测试失败',
                data: null
            };
        }

        // 返回标准格式响应
        return {
            isSuccess: true,
            message: '知识库搜索测试成功',
            data: result.data
        };
    }

    /**
     * 更新知识库搜索设置
     * @param settings 搜索设置参数
     * @returns 更新结果
     */
    @Post('update-knowledge-search-settings')
    async updateKnowledgeSearchSettings(@Body() settings: KnowledgeSearchSettings) {
        this.logger.log(`收到更新知识库搜索设置请求: ${JSON.stringify(settings)}`);

        // 验证必须字段
        if (!settings.knowledgeId) {
            return {
                isSuccess: false,
                message: '知识库ID不能为空',
                data: null
            };
        }

        // 调用服务更新知识库搜索设置
        const result = await this.knowledgeService.updateKnowledgeSearchSettings(settings);

        // 返回标准格式响应
        if (!result) {
            return {
                isSuccess: false,
                message: '更新知识库搜索设置失败',
                data: null
            };
        }
        
        return {
            isSuccess: true,
            message: '更新知识库搜索设置成功',
            data: null
        };
    }
}

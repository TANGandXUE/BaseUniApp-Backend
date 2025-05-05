import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { TaskRecordsService } from '../../../apps/service/task-records/task-records.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { AppListService } from 'src/module/apps/service/app-list/app-list.service';

// 违禁词列表
const forbiddenWords = `
极限词与夸大宣传词
最佳、最具、最赚、最优、最优秀、最好、最大、最高、最强
中国第一、全国第一、全网第一、排名第一、第一品牌、行业第一
国家级、世界级、顶级、极致、独一无二、绝无仅有、史无前例、前无古人

虚假承诺与绝对化用词
立马见效、100%有效、零风险、永久、无敌、终生、绝对不起球、终生穿不坏

品牌相关禁忌词
领袖品牌、世界领先、缔造者、至尊、巅峰

价格与促销相关禁忌词
仅此一次、最后一天、点击领奖、点击获取、秒杀、抢爆

医疗保健相关禁忌词
治愈、根治、痊愈、药到病除、无效退款、降血压、修复受损肌肤

迷信相关禁忌词
旺夫旺子、带来好运气、增强第六感、画小人、逢凶化吉、转运

不文明用语及歧视性语言
高丽棒子、黑鬼、杂种、东亚病夫、蛮夷、大男人、小女人、男尊女卑、重男轻女、洋鬼子、小日本、大汉族主义

涉及政治敏感、违法违规词汇
反动、分裂、邪教、暴力革命

诱导性词语
保值、升值、有投资价值、投资回报

其他平台相关词汇
微信、QQ、B站、知乎、小红书、淘宝、京东

材质虚假描述词
纯棉、百分百棉、真皮真丝

疑似欺骗用户的词语
假一赔万、100%正品、点击有惊喜、免单、免费领取

暴利色情类词语
性生活、算命

涉及未经授权的版权材料表述
未经授权的音乐、视频、图片

侵犯他人隐私的词汇
身份信息、家庭住址

负面的攻击性言论词汇
恶意攻击、诽谤

误导性的广告宣传词汇
误导性操作、诱导交易

不实的健康声明词汇
未经证实的健康效果、无科学依据的治疗能力

违反公序良俗的词汇
色情、低俗、血腥、暴力、诋毁国家
`.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.includes('词'))
    .join('、')
    .split('、')
    .map(word => word.trim())
    .filter(word => word);

// 系统提示词
export const forbiddenWordsPrompt = `
请注意避免使用以下违禁词和敏感词：
${forbiddenWords.join('、')}
`;

// 检查文本中的违禁词
export function checkForbiddenWords(text: string): string[] {
    const foundWords: string[] = [];
    for (const word of forbiddenWords) {
        if (text.includes(word)) {
            foundWords.push(word);
        }
    }
    return foundWords;
}

// 简单替换违禁词
export function replaceForbiddenWords(text: string): string {
    let result = text;
    for (const word of forbiddenWords) {
        // 根据词语长度用相应数量的*替换
        const replacement = '*'.repeat(word.length);
        result = result.replace(new RegExp(word, 'g'), replacement);
    }
    return result;
}

// 定义生成参数的类型
export interface GenerateTextBaseParams {
    type: 'explain' | 'control' | 'qa';
    style: string;
    wordCount: number;
    background: string;
    suggestion: string;  // 添加生成建议字段
}

export interface CategoryInfo {
    name: string;
    count: number;
}

export interface ExplainControlParams extends GenerateTextBaseParams {
    type: 'explain' | 'control';
    categories: CategoryInfo[];
}

export interface QAParams extends GenerateTextBaseParams {
    type: 'qa';
    count: number;
    requirements: string[];
}

export type GenerateTextParams = ExplainControlParams | QAParams;

export interface ScriptItem {
    text?: string;
    keywords?: string;
    generateAudio?: boolean;
}

export type ScriptGroup = ScriptItem[] | ScriptItem;
export type GeneratedScript = ScriptGroup[];

const ScriptItemSchema = z.object({
    text: z.string().optional(),
    keywords: z.string().optional(),
    generateAudio: z.boolean()
});

const ScriptSchema = z.object({
    scripts: z.array(z.array(ScriptItemSchema).or(z.array(z.object({
        text: z.string().optional(),
        keywords: z.string().optional(),
        generateAudio: z.boolean()
    }))))
});

@Injectable()
export class LiveTextService {
    constructor(
        private readonly taskRecordsService: TaskRecordsService,
        private readonly sqlService: SqlService,
        private readonly appListService: AppListService
    ) { }

    // 文本润色方法
    async polishText(
        text: string, 
        prompt: string, 
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number
    ): Promise<any> {
        console.log('开始润色文本，原文：', text);
        console.log('润色提示词：', prompt);

        try {
            // 预估所需点数 (简单估算：每100字1点)
            const textLength = text.length;
            const pointsNeeded = Math.max(1, Math.ceil(textLength / 100));
            
            // 检查余额是否充足
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, pointsNeeded);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: `余额不足，预估需要${pointsNeeded}点数（文本长度${textLength}字）`,
                    data: {
                        textLength,
                        pointsNeeded,
                        userPoints: user.userPoints
                    }
                }
            }

            // 如果提供了historyId，获取并验证现有记录
            let taskRecord;
            if (historyId) {
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                
                if (existingRecord && existingRecord.historyUserId === user.userId) {
                    // 更新现有记录状态
                    taskRecord = await this.taskRecordsService.updateTaskRecord({
                        historyId: historyId,
                        historyStatus: 'processing',
                        historyResult: [...existingRecord.historyResult, {
                            type: 'polish',
                            originalText: text,
                            prompt: prompt,
                            estimatedPoints: pointsNeeded
                        }]
                    });
                } else {
                    // 记录不存在或不属于当前用户，创建新记录
                    taskRecord = await this.taskRecordsService.writeTaskRecord({
                        historyUserId: user.userId,
                        historyAppId: 26,
                        historyStatus: 'processing',
                        historyStartTime: new Date(),
                        historyUseTime: 0,
                        historyUsePoints: 0,
                        historyResult: [{
                            type: 'polish',
                            originalText: text,
                            prompt: prompt,
                            estimatedPoints: pointsNeeded
                        }],
                        historyErrorInfos: []
                    });
                }
            } else {
                // 未提供historyId，创建新记录
                taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 26,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: 0,
                    historyResult: [{
                        type: 'polish',
                        originalText: text,
                        prompt: prompt,
                        estimatedPoints: pointsNeeded
                    }],
                    historyErrorInfos: []
                });
            }

            const openai = new OpenAI({
                apiKey: process.env.GENERATE_TEXT_API_KEY,
                baseURL: process.env.GENERATE_TEXT_BASE_URL,
                dangerouslyAllowBrowser: true,
            });

            const startTime = Date.now();
            const completion = await openai.chat.completions.create({
                model: process.env.GENERATE_TEXT_MODEL || "qwen-turbo",
                messages: [
                    { 
                        role: "system", 
                        content: "你是一个专业的文本润色助手。请直接返回润色后的文本，不要添加任何额外说明、标记或解释。" + forbiddenWordsPrompt
                    },
                    {
                        role: "user",
                        content: `请按照以下要求润色文本，直接返回润色结果：\n${prompt}\n\n${text}`
                    }
                ],
                temperature: 0.7
            });

            const polishedText = completion.choices[0].message.content;
            if (!polishedText) {
                throw new Error("润色结果为空");
            }

            // 检查违禁词
            const foundWords = checkForbiddenWords(polishedText);
            let finalText = polishedText;
            if (foundWords.length > 0) {
                // 如果包含违禁词，替换它们
                finalText = replaceForbiddenWords(polishedText);
            }

            const endTime = Date.now();
            const useTime = endTime - startTime;

            // 扣除点数
            const deductResult = await this.sqlService.deductPointsWithCheck(user, pointsNeeded);
            
            // 更新任务记录
            await this.taskRecordsService.updateTaskRecord({
                historyId: taskRecord.historyId,
                historyStatus: 'completed',
                historyUseTime: useTime,
                historyUsePoints: pointsNeeded,
                historyResult: [{
                    type: 'polish',
                    originalText: text,
                    prompt: prompt,
                    polishedText: finalText,
                    foundForbiddenWords: foundWords,
                    pointsUsed: pointsNeeded
                }]
            });

            console.log('润色后的文本：', finalText);
            return {
                isSuccess: true,
                message: foundWords.length > 0 ? '文本润色成功，但发现并替换了违禁词' : '文本润色成功',
                data: {
                    polishedText: finalText,
                    foundForbiddenWords: foundWords,
                    pointsUsed: pointsNeeded
                }
            };
        } catch (error) {
            console.error('润色文本时发生错误：', error);
            
            if (error.message.includes('exceeded your current quota')) {
                return {
                    isSuccess: false,
                    message: '服务器配额不足，请联系管理员',
                    data: null
                };
            }
            
            return {
                isSuccess: false,
                message: `润色文本失败: ${error.message}`,
                data: null
            };
        }
    }

    // 去除违禁词方法
    async removeForbiddenWords(
        text: string, 
        prompt: string, 
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number
    ): Promise<any> {
        console.log('开始去除违禁词，原文：', text);
        console.log('处理要求：', prompt);

        try {
            // 先检查违禁词
            const foundWords = checkForbiddenWords(text);
            console.log('发现的违禁词：', foundWords);

            if (foundWords.length === 0) {
                return {
                    isSuccess: true,
                    message: '未发现违禁词',
                    data: {
                        cleanedText: text,
                        foundForbiddenWords: [],
                        pointsUsed: 0
                    }
                }; // 如果没有违禁词，直接返回原文
            }

            // 预估所需点数 (每发现一个违禁词0.5点，最低1点)
            const pointsNeeded = Math.max(1, Math.ceil(foundWords.length * 0.5));
            
            // 检查余额是否充足
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, pointsNeeded);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: `余额不足，预估需要${pointsNeeded}点数（发现${foundWords.length}个违禁词）`,
                    data: {
                        foundForbiddenWords: foundWords,
                        pointsNeeded,
                        userPoints: user.userPoints
                    }
                }
            }

            // 如果提供了historyId，获取并验证现有记录
            let taskRecord;
            if (historyId) {
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                
                if (existingRecord && existingRecord.historyUserId === user.userId) {
                    // 更新现有记录状态
                    taskRecord = await this.taskRecordsService.updateTaskRecord({
                        historyId: historyId,
                        historyStatus: 'processing',
                        historyResult: [...existingRecord.historyResult, {
                            type: 'removeForbiddenWords',
                            originalText: text,
                            prompt: prompt,
                            foundForbiddenWords: foundWords,
                            estimatedPoints: pointsNeeded
                        }]
                    });
                } else {
                    // 记录不存在或不属于当前用户，创建新记录
                    taskRecord = await this.taskRecordsService.writeTaskRecord({
                        historyUserId: user.userId,
                        historyAppId: 26,
                        historyStatus: 'processing',
                        historyStartTime: new Date(),
                        historyUseTime: 0,
                        historyUsePoints: 0,
                        historyResult: [{
                            type: 'removeForbiddenWords',
                            originalText: text,
                            prompt: prompt,
                            foundForbiddenWords: foundWords,
                            estimatedPoints: pointsNeeded
                        }],
                        historyErrorInfos: []
                    });
                }
            } else {
                // 未提供historyId，创建新记录
                taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 26,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: 0,
                    historyResult: [{
                        type: 'removeForbiddenWords',
                        originalText: text,
                        prompt: prompt,
                        foundForbiddenWords: foundWords,
                        estimatedPoints: pointsNeeded
                    }],
                    historyErrorInfos: []
                });
            }

            const openai = new OpenAI({
                apiKey: process.env.GENERATE_TEXT_API_KEY,
                baseURL: process.env.GENERATE_TEXT_BASE_URL,
                dangerouslyAllowBrowser: true,
            });

            const startTime = Date.now();
            const completion = await openai.chat.completions.create({
                model: process.env.GENERATE_TEXT_MODEL || "qwen-turbo",
                messages: [
                    { 
                        role: "system", 
                        content: "你是一个专业的文本优化助手。请帮助用户重写文本，去除所有违禁词，保持原意的同时使表达更加规范。" + forbiddenWordsPrompt
                    },
                    {
                        role: "user",
                        content: `请按照以下要求重写文本，去除违禁词：\n${prompt}\n\n原文中包含以下违禁词：${foundWords.join('、')}\n\n原文：${text}`
                    }
                ],
                temperature: 0.7
            });

            const cleanedText = completion.choices[0].message.content;
            if (!cleanedText) {
                throw new Error("处理结果为空");
            }

            // 再次检查处理后的文本是否还包含违禁词
            let finalText = cleanedText;
            const remainingWords = checkForbiddenWords(cleanedText);
            if (remainingWords.length > 0) {
                // 如果AI没能完全去除违禁词，使用简单替换
                finalText = replaceForbiddenWords(cleanedText);
            }

            const endTime = Date.now();
            const useTime = endTime - startTime;

            // 扣除点数
            const deductResult = await this.sqlService.deductPointsWithCheck(user, pointsNeeded);
            
            // 更新任务记录
            await this.taskRecordsService.updateTaskRecord({
                historyId: taskRecord.historyId,
                historyStatus: 'completed',
                historyUseTime: useTime,
                historyUsePoints: pointsNeeded,
                historyResult: [{
                    type: 'removeForbiddenWords',
                    originalText: text,
                    prompt: prompt,
                    cleanedText: finalText,
                    foundForbiddenWords: foundWords,
                    remainingForbiddenWords: remainingWords,
                    pointsUsed: pointsNeeded
                }]
            });

            console.log('处理后的文本：', finalText);
            return {
                isSuccess: true,
                message: remainingWords.length > 0 ? '违禁词处理完成，但仍有部分违禁词被强制替换' : '违禁词处理成功',
                data: {
                    cleanedText: finalText,
                    foundForbiddenWords: foundWords,
                    remainingForbiddenWords: remainingWords,
                    pointsUsed: pointsNeeded
                }
            };
        } catch (error) {
            console.error('去除违禁词时发生错误：', error);
            
            if (error.message.includes('exceeded your current quota')) {
                return {
                    isSuccess: false,
                    message: '服务器配额不足，请联系管理员',
                    data: null
                };
            }
            
            return {
                isSuccess: false,
                message: `去除违禁词失败: ${error.message}`,
                data: null
            };
        }
    }

    // 估算生成文本的点数
    private async estimatePointsForGenerateText(params: GenerateTextParams): Promise<number> {
        let basePoints = 0;
        
        // 根据类型确定基础点数
        if (params.type === 'qa') {
            // 问答类型，根据要生成的问答对数量计算
            basePoints = (params.count || 1) * 2; // 每个问答对2点
        } else {
            // 讲解或场控类型，根据所有分类的总条数计算
            const totalItems = params.categories.reduce((sum, category) => sum + category.count, 0);
            basePoints = totalItems * 1; // 每条话术1点
        }
        
        // 根据字数要求调整点数
        if (params.wordCount > 100) {
            basePoints = Math.ceil(basePoints * 1.5); // 字数超过100，点数增加50%
        }
        
        // 最低消费1点
        return Math.max(1, basePoints);
    }

    // 生成文本的函数
    async generateText(
        params: GenerateTextParams, 
        user: {
            userId: number;
            userPhone: string;
            userEmail: string;
            userPoints: number;
        },
        historyId?: number
    ): Promise<any> {
        console.log('开始生成文本，参数：', params);

        try {
            // 预估所需点数
            const pointsNeeded = await this.estimatePointsForGenerateText(params);
            
            // 获取应用的计费配置
            const appList = await this.appListService.getPublicAppList();
            const appCostConfig = appList.data.find(app => app.AppId === 26)?.AppCostConfig;
            const baseCostPerRequest = appCostConfig?.generateText?.cost || pointsNeeded; // 如果配置了，使用配置的点数
            
            const finalPointsNeeded = Math.max(baseCostPerRequest, pointsNeeded);
            
            // 检查余额是否充足
            const isPointsEnough = await this.sqlService.isPointsEnoughByUserId(user.userId, finalPointsNeeded);
            if (!isPointsEnough.isSuccess) {
                return {
                    isSuccess: false,
                    message: `余额不足，预估需要${finalPointsNeeded}点数`,
                    data: {
                        pointsNeeded: finalPointsNeeded,
                        userPoints: user.userPoints
                    }
                }
            }

            // 如果提供了historyId，获取并验证现有记录
            let taskRecord;
            if (historyId) {
                const existingRecord = await this.taskRecordsService.getTaskRecordById(historyId);
                
                if (existingRecord && existingRecord.historyUserId === user.userId) {
                    // 更新现有记录状态
                    taskRecord = await this.taskRecordsService.updateTaskRecord({
                        historyId: historyId,
                        historyStatus: 'processing',
                        historyResult: [...existingRecord.historyResult, {
                            type: 'generateText',
                            params: params,
                            estimatedPoints: finalPointsNeeded
                        }]
                    });
                } else {
                    // 记录不存在或不属于当前用户，创建新记录
                    taskRecord = await this.taskRecordsService.writeTaskRecord({
                        historyUserId: user.userId,
                        historyAppId: 26,
                        historyStatus: 'processing',
                        historyStartTime: new Date(),
                        historyUseTime: 0,
                        historyUsePoints: 0,
                        historyResult: [{
                            type: 'generateText',
                            params: params,
                            estimatedPoints: finalPointsNeeded
                        }],
                        historyErrorInfos: []
                    });
                }
            } else {
                // 未提供historyId，创建新记录
                taskRecord = await this.taskRecordsService.writeTaskRecord({
                    historyUserId: user.userId,
                    historyAppId: 26,
                    historyStatus: 'processing',
                    historyStartTime: new Date(),
                    historyUseTime: 0,
                    historyUsePoints: 0,
                    historyResult: [{
                        type: 'generateText',
                        params: params,
                        estimatedPoints: finalPointsNeeded
                    }],
                    historyErrorInfos: []
                });
            }

            const openai = new OpenAI({
                apiKey: process.env.GENERATE_TEXT_API_KEY,
                baseURL: process.env.GENERATE_TEXT_BASE_URL,
                dangerouslyAllowBrowser: true,
            });

            const systemPrompt = "你是一个专业的直播话术生成助手。请直接返回JSON格式数据，不要使用markdown格式，不要添加任何额外的文字说明。" +
                "对于场控音生成任务，每条场控音都需要生成音频(generateAudio=true)。" +
                "对于问答生成任务，问题不需要生成音频(generateAudio=false)，答案需要生成音频(generateAudio=true)。" +
                "返回格式示例：{\"scripts\":[[{\"text\":\"欢迎来到直播间\",\"generateAudio\":true}]]}" +
                forbiddenWordsPrompt;

            // 构建提示词
            let prompt = '';
            if (params.type === 'qa') {
                prompt = `
任务类型：问答生成
生成要求：请生成${params.count}组问答对，每组包含问题关键词和详细回答
生成风格：${params.style}
单条字数：${params.wordCount}
背景知识：${params.background}

具体要求：
${params.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

返回格式要求：
{
    "scripts": [
        {
            "keywords": "关键词1 关键词2 关键词3 关键词4 关键词5",
            "text": "详细回答内容1"
        },
        {
            "keywords": "关键词1 关键词2 关键词3 关键词4 关键词5",
            "text": "详细回答内容2"
        }
        // ... 共${params.count}组
    ]
}

注意：
1. 必须严格按照以上JSON格式返回
2. 必须生成${params.count}组完整的问答对
3. 每组问答都必须包含keywords和text两个字段
4. 每组关键词必须是5个，用空格分隔
5. 每组回答必须完整详细地覆盖对应的5个关键词
`;
            } else {
                prompt = `
任务类型：${params.type === 'explain' ? '讲解音生成' : '场控文字生成'}
生成风格：${params.style}
单条字数：${params.wordCount}
背景知识：${params.background}
分类要求：
${params.categories.map(c => `${c.name}：${c.count}条`).join('\n')}
要求：生成的每条话术${params.type === 'explain' ? '都需要' : '都不需要'}生成音频。
`;
            }

            if (params.suggestion) {
                prompt += `\n生成建议：${params.suggestion}`;
            }

            const startTime = Date.now();
            try {
                const completion = await openai.beta.chat.completions.parse({
                    model: process.env.GENERATE_TEXT_MODEL || "qwen-turbo",
                    messages: [
                        { 
                            role: "system", 
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: prompt + "\n请直接返回JSON数据，不要使用markdown格式。",
                        },
                    ],
                    response_format: {
                        type: "json_object",
                        schema: ScriptSchema,
                        name: "script_generation"
                    },
                    temperature: 0.7
                });

                const content = completion.choices[0].message.content;
                if (!content) {
                    throw new Error("返回的内容为空");
                }

                const jsonStr = content.replace(/```json\n|\n```/g, '');
                console.log('提取的 JSON 字符串：', jsonStr);
                
                let finalScripts: GeneratedScript = [];
                
                // 解析返回的数据
                if (params.type === 'qa' && jsonStr.includes('"scripts"')) {
                    const result = JSON.parse(jsonStr);
                    if (Array.isArray(result.scripts)) {
                        finalScripts = result.scripts.map((item: any) => [
                            { text: item.keywords, generateAudio: false },
                            { text: item.text, generateAudio: true }
                        ]);
                    }
                } else if (params.type === 'qa' && jsonStr.includes('"keywords"') && jsonStr.includes('"text"')) {
                    const qaResult = JSON.parse(jsonStr);
                    finalScripts = [[
                        { text: qaResult.keywords, generateAudio: false },
                        { text: qaResult.text, generateAudio: true }
                    ]];
                } else {
                    const result = JSON.parse(jsonStr) as z.infer<typeof ScriptSchema>;
                    if (!result || !result.scripts) {
                        throw new Error('返回的数据格式不正确');
                    }
                    
                    // 确保所有项目都有generateAudio属性
                    finalScripts = result.scripts.map(group => {
                        if (Array.isArray(group)) {
                            return group.map(item => {
                                const itemAny = item as any;
                                const scriptItem: ScriptItem = {
                                    text: itemAny.text,
                                    keywords: itemAny.keywords,
                                    generateAudio: itemAny.generateAudio !== undefined ? itemAny.generateAudio : (params.type === 'explain')
                                };
                                return scriptItem;
                            });
                        } else {
                            const groupAny = group as any;
                            const scriptItem: ScriptItem = {
                                text: groupAny.text,
                                keywords: groupAny.keywords,
                                generateAudio: groupAny.generateAudio !== undefined ? groupAny.generateAudio : (params.type === 'explain')
                            };
                            return scriptItem;
                        }
                    });
                }

                // 检查生成的文本是否包含违禁词
                let containsForbiddenWords = false;
                const forbiddenWordsFound: Record<string, string[]> = {};
                
                finalScripts.forEach((group, groupIndex) => {
                    if (Array.isArray(group)) {
                        group.forEach((item, itemIndex) => {
                            if (item.text) {
                                const foundWords = checkForbiddenWords(item.text);
                                if (foundWords.length > 0) {
                                    containsForbiddenWords = true;
                                    forbiddenWordsFound[`group_${groupIndex}_item_${itemIndex}`] = foundWords;
                                    // 替换违禁词
                                    item.text = replaceForbiddenWords(item.text);
                                }
                            }
                        });
                    } else if (group.text) {
                        const foundWords = checkForbiddenWords(group.text);
                        if (foundWords.length > 0) {
                            containsForbiddenWords = true;
                            forbiddenWordsFound[`group_${groupIndex}`] = foundWords;
                            // 替换违禁词
                            group.text = replaceForbiddenWords(group.text);
                        }
                    }
                });

                const endTime = Date.now();
                const useTime = endTime - startTime;

                // 扣除点数
                const deductResult = await this.sqlService.deductPointsWithCheck(user, finalPointsNeeded);
                
                // 更新任务记录
                await this.taskRecordsService.updateTaskRecord({
                    historyId: taskRecord.historyId,
                    historyStatus: 'completed',
                    historyUseTime: useTime,
                    historyUsePoints: finalPointsNeeded,
                    historyResult: [{
                        type: 'generateText',
                        params: params,
                        scripts: finalScripts,
                        containsForbiddenWords,
                        forbiddenWordsFound,
                        pointsUsed: finalPointsNeeded
                    }]
                });

                return {
                    isSuccess: true,
                    message: containsForbiddenWords ? '文本生成成功，但自动替换了部分违禁词' : '文本生成成功',
                    data: {
                        scripts: finalScripts,
                        containsForbiddenWords,
                        forbiddenWordsFound: containsForbiddenWords ? forbiddenWordsFound : null,
                        pointsUsed: finalPointsNeeded
                    }
                };
            } catch (parseError) {
                console.error('JSON解析错误：', parseError);
                
                // 更新任务记录
                await this.taskRecordsService.updateTaskRecord({
                    historyId: taskRecord.historyId,
                    historyStatus: 'failed',
                    historyUseTime: Date.now() - startTime,
                    historyUsePoints: 0,
                    historyErrorInfos: [{
                        errorMessage: `数据解析失败: ${parseError.message}`,
                        errorDetails: parseError.stack
                    }]
                });
                
                throw new Error('返回的数据格式不正确: ' + parseError.message);
            }
        } catch (error) {
            console.error('生成文本时发生错误：', error);
            
            if (error.message.includes('exceeded your current quota')) {
                return {
                    isSuccess: false,
                    message: '服务器配额不足，请联系管理员',
                    data: null
                };
            }
            
            return {
                isSuccess: false,
                message: `生成文本失败: ${error.message}`,
                data: null
            };
        }
    }
    
    // 获取历史记录
    async getTaskHistory(userId: number, taskId: number): Promise<any> {
        try {
            const record = await this.taskRecordsService.getTaskRecordById(taskId);
            
            // 检查记录是否属于当前用户
            if (record && record.historyUserId !== userId) {
                return {
                    isSuccess: false,
                    message: '无权查看此记录',
                    data: null
                };
            }
            
            return {
                isSuccess: true,
                message: '获取历史记录成功',
                data: record
            };
        } catch (error) {
            console.error('获取历史记录时发生错误：', error);
            return {
                isSuccess: false,
                message: `获取历史记录失败: ${error.message}`,
                data: null
            };
        }
    }
}
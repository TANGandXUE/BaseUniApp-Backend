import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { MeituautoService } from '../meituauto/meituauto.service';
import { paramsForApis } from 'src/others/paramsForApis';
import * as dotenv from 'dotenv';
dotenv.config();

// 数据库相关
import { InjectRepository } from '@nestjs/typeorm';
import { ParamsInfo } from 'src/entities/params.entity';
import { Repository } from 'typeorm';


@Injectable()
export class ChatqwenService {

    constructor(

        // 初始化数据库
        @InjectRepository(ParamsInfo)
        private readonly paramsRepository: Repository<ParamsInfo>,


        // 初始化服务
        private readonly meituautoService: MeituautoService,
        // private readonly meituautoParams: MeituAutoParams,
    ) { }

    // 引入参数列表
    private tools = paramsForApis;


    private async get_response(messages: object, userLevel: number) {
        // 根据用户等级选用不同模型
        let model: string = '';
        switch (userLevel) {
            case 0:
                model = 'qwen-plus';
                break;
            case 1:
                model = 'qwen-max-longcontext';
                break;
            case 2:
                model = 'qwen-max-longcontext';
                break;
            default:
                model = 'qwen-plus';
        }
        console.log('model: ', model);

        const api_key = process.env.QWEN_API_KEY;
        const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        };
        const body = {
            'model': model,
            "input": {
                "messages": messages
            },
            "parameters": {
                "result_format": "message",
                "tools": this.tools
            }
        }

        try {
            const response = await axios.post(url, body, { headers });
            return response.data;
        } catch (error) {
            console.error('发生错误', error);
        }



    }

    // 参数处理
    private async paramsProcess(responseParams: any, input_service: string, paramsTemplate: object, inputTemplateParams: object) {

        // 有时的tool_call为：
        // {
        //     function: {
        //         name: 'meituauto',
        //         arguments: '{"properties": {"color_tuning": {"red_reducement": 20, "brightness_increase": 20}}'
        //     },
        //     id: '',
        //     type: 'function'
        // }

        let tool_call: any = {};

        // 查找指定input_service的tool_call
        if (responseParams && responseParams.tool_calls) {
            tool_call = responseParams.tool_calls.find(
                (tool_call) => tool_call.function.name === input_service
            );
        } else {
            tool_call = {
                "function": {
                    "name": input_service,
                    "arguments": JSON.stringify({
                        "properties": {}
                    }),
                }
            };
        }


        const responseArguments = JSON.parse(tool_call.function.arguments);

        // console.log("responseArguments的值为", responseArguments.properties);
        // console.log("paramsTemplate: ", paramsTemplate);

        const requiredParams: any = {};

        // 如果是美图智能API
        if (input_service === 'meituauto') {

            console.log('responseArguments: ', responseArguments);

            // responseArguments:  {
            //     properties: {
            //       filter: {
            //         filter_id: 'Fa5Ko6DFZ0M7LYq0',
            //         filters_lut_alpha: 50,
            //         filter_is_black: 0
            //       }
            //     }
            //   }

            for (const key in paramsTemplate) {
                // console.log('key值为: ', responseArguments.properties );
                // console.log('key: ', key);
                // console.log('存在: ', responseArguments.properties.hasOwnProperty(key));



                // 检查responseArguments是否包含key
                // PS: 由于阿里模型返回结果不稳定，有时候返回结果套了一层.properties，有时候是直接给里面的参数的，所以特此做一个是否存在properties的判定，如果没有的话，那就直接跳过这一层直接去里面的参数
                if (responseArguments.properties && responseArguments.properties.hasOwnProperty(key)) {


                    // 如果是滤镜属性，即key的名字为filter
                    if (key === 'filter') {
                        requiredParams[key] = responseArguments.properties[key];
                        console.log('requiredParams[key]: ', requiredParams[key]);
                        console.log('requiredParams: ', requiredParams);
                    }
                    //检查key是否为Array
                    else if (Array.isArray(paramsTemplate[key])) {
                        // console.log('key是数组: ', key);

                        // 数值合法性检验
                        if (Number(responseArguments.properties[key]) < -500 || Number(responseArguments.properties[key]) > 500) {
                            throw new Error('参数值必须在-500~500之间');
                        } else {
                            requiredParams[key] = [
                                Number(responseArguments.properties[key]),
                                Number(responseArguments.properties[key]),
                                Number(responseArguments.properties[key]),
                                Number(responseArguments.properties[key]),
                                Number(responseArguments.properties[key])
                            ]
                        }

                    } else {
                        // console.log('key是数字: ', key);
                        if (Number(responseArguments.properties[key]) < -500 || Number(responseArguments.properties[key]) > 500) {
                            throw new Error('参数值必须在-500~500之间');
                        } else {
                            requiredParams[key] = Number(responseArguments.properties[key]);
                        }
                    }


                } else if (responseArguments.hasOwnProperty(key)) {
                    // 如果是滤镜属性，即key的名字为filter
                    if (key === 'filter') {
                        requiredParams[key] = responseArguments[key];
                        console.log('requiredParams[key]: ', requiredParams[key]);
                        console.log('requiredParams: ', requiredParams);
                    }
                    //检查key是否为Array
                    else if (Array.isArray(paramsTemplate[key])) {
                        // console.log('key是数组: ', key);

                        // 数值合法性检验
                        if (Number(responseArguments[key]) < -500 || Number(responseArguments[key]) > 500) {
                            throw new Error('参数值必须在-500~500之间');
                        } else {
                            requiredParams[key] = [
                                Number(responseArguments[key]),
                                Number(responseArguments[key]),
                                Number(responseArguments[key]),
                                Number(responseArguments[key]),
                                Number(responseArguments[key])
                            ]
                        }

                    } else {
                        // console.log('key是数字: ', key);
                        if (Number(responseArguments[key]) < -500 || Number(responseArguments[key]) > 500) {
                            throw new Error('参数值必须在-500~500之间');
                        } else {
                            requiredParams[key] = Number(responseArguments[key]);
                        }
                    }
                }
            }

        }

        console.log("requiredParams: ", requiredParams);

        let mergedParams = { ...inputTemplateParams, ...requiredParams };

        //如果空值，给默认值
        if (Object.keys(mergedParams).length === 0) {

            if (input_service === 'meituauto')
                mergedParams = this.meituautoService.defaultParams;

        }

        return mergedParams;

    }


    async txt2param(input_message: string, input_service: string, inputTemplateParams: object, userLevel: number) {
        console.log('txt2param内的inputTemplateParams: ', inputTemplateParams);

        // 读取参数列表，合并预设模板
        let paramsTemplate = {};
        if (input_service === 'meituauto') {
            paramsTemplate = this.meituautoService.publicParams;
        } else {
            throw new Error('chatqwen.service.ts中txt2param中，input_service值错误，无法与现有的API端匹配');
        }

        const message = [
            {
                "role": "system",
                "content": "你是一个生成图像处理所需参数的助手，你必须根据用户描述的内容中的意思，通过function call将描述内容转换成参数返回给用户，只需返回部分 非零值的属性 即可，不在 required数组 的参数 无需返回。这些参数包含：画质优化、色彩优化、美颜(美白、提亮)、瘦脸(缩小头部，减小脸宽)、肤色统一。返回格式举例：{properties: {exposure_norm_coef: 50, face_beauty_alpha: 50, smooth_face_skin_alpha: 50}}。"
            }
        ]

        console.log('input_message: ', input_message);
        console.log('input_message.length: ', input_message.length);

        message.push(
            {
                "role": "user",
                "content": input_message
            }
        )

        //获取API端返回值
        const response = await this.get_response(message, userLevel);
        console.log('response.output.choices[0].message.tool_calls: ', response.output.choices[0].message.tool_calls);


        // console.log(' publicParams: ', this.meituautoService.publicParams);

        //处理API端返回参数并返回处理后的参数
        return await this.paramsProcess(response.output.choices[0].message, input_service, paramsTemplate, inputTemplateParams);
    }

    // // 实现两个对象的深度合并
    // private deepMerge(...objects: any[]): any {
    //     const isObject = (obj: any) => obj && typeof obj === 'object';

    //     return objects.reduce((previous, current) => {
    //         Object.keys(current).forEach(key => {
    //             const pVal = previous[key];
    //             const cVal = current[key];

    //             if (Array.isArray(pVal) && Array.isArray(cVal)) {
    //                 previous[key] = pVal.concat(cVal);
    //             } else if (isObject(pVal) && isObject(cVal)) {
    //                 previous[key] = this.deepMerge(pVal, cVal);
    //             } else {
    //                 previous[key] = cVal;
    //             }
    //         });
    //         return previous;
    //     }, {});
    // }



}

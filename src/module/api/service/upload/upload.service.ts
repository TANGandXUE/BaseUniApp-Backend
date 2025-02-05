import { Injectable, HttpException } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import * as axios from 'axios';
import * as fs from 'fs';
// import { ImageenhanClient } from '@alicloud/imageenhan20190930';
const ImageenhanClient = require('@alicloud/imageenhan20190930');
const OpenapiClient = require('@alicloud/openapi-client');
const TeaUtil = require('@alicloud/tea-util');

import * as dotenv from 'dotenv'; // .env相关
dotenv.config();  // .env相关

import { DatatransService } from 'src/service/datatrans/datatrans.service';

@Injectable()
export class UploadService {

  constructor(private readonly datatransService: DatatransService) { }


  async meitu_filter(apiKey: string, secretKey: string, imagePaths: string[], filterParams: any): Promise<any> {
    try {

      // console.log("ImagePaths：", imagePaths)

      // console.log("实参为：", filterParams, imagePaths)
      // 处理每个图片路径，构建请求体
      const requestBody = {
        media_info_list: imagePaths.map((imagePath) => {
          const image = fs.readFileSync(imagePath, { encoding: 'base64' });
          const mediaData = image; // 直接使用读取到的Base64字符串，无需添加头部

          return {
            media_data: mediaData,
            media_profiles: {
              media_data_type: 'jpg',
            },
          };
        }),
        parameter: filterParams,
      };

      // console.log("这里执行到了");
      // console.log("请求体为：", requestBody);

      // 发起 POST 请求
      const url = `https://openapi.mtlab.meitu.com/v1/filter?api_key=${apiKey}&api_secret=${secretKey}`;
      const response: AxiosResponse = await axios.default.post(url, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        statusCode: response.status,
        data: response.data,
      };
    } catch (error) {
        // console.error("error为：", error);
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new HttpException({
            statusCode: axiosError.response.status,
            message: axiosError.response.data,
            data: axiosError.response.data,
          }, axiosError.response.status);
        } else {
          throw new HttpException({
            statusCode: 500,
            message: error.message,
          }, 500);
        }
    }
  }


  config = new OpenapiClient.Config({
    // 创建AccessKey ID和AccessKey Secret，请参考https://help.aliyun.com/document_detail/175144.html。
    // 如果您用的是RAM用户AccessKey，还需要为RAM用户授予权限AliyunVIAPIFullAccess，请参考https://help.aliyun.com/document_detail/145025.html。
    // 从环境变量读取配置的AccessKey ID和AccessKey Secret。运行示例前必须先配置环境变量。 
    accessKeyId: process.env.ALI_IMAGEENHAN_ACCESS_KEY_ID,   
    accessKeySecret: process.env.ALI_IMAGEENHAN_ACCESS_KEY_SECRET
  });

  async ali_imageEnhan(fileInfos: Array<{ fileName: string }>, resultType: string) {
    this.config.endpoint = 'imageenhan.cn-shanghai.aliyuncs.com';
    const client = new ImageenhanClient.default(this.config);

    const resultPromises: Array<Promise<{ fileName: string; fileURL: string }>> = [];

    for (const fileInfo of fileInfos) {
      const enhanceImageColorRequest = new ImageenhanClient.EnhanceImageColorRequest({
        mode: "Rec709",
        outputFormat: resultType,
        imageURL: `https://clouddreamai.oss-cn-shanghai.aliyuncs.com/${fileInfo.fileName}`,
      });


      resultPromises.push(
        new Promise<{ fileName: string; fileURL: string }>((resolve, reject) => {
          const runtime = new TeaUtil.RuntimeOptions({});

          client
            .enhanceImageColorWithOptions(enhanceImageColorRequest, runtime)
            .then((enhanceImageColorResponse) => {

              // 获取增强后的图片URL
              const enhancedImageUrl = enhanceImageColorResponse.body.data.imageURL;

              // // 去除原文件名的后缀
              // const baseNameWithoutExt = path.basename(fileInfo.fileName, path.extname(fileInfo.fileName));

              // 解决Promise，传递结果
              resolve({ fileName: `result-${fileInfo.fileName}`, fileURL: enhancedImageUrl });
            })
            .catch((error) => {
              // 错误处理
              reject(`处理文件${fileInfo.fileName}时出错：${error}`);
            });
        })
      );
    }

    // 使用Promise.all等待所有请求完成
    try {
      const result = await Promise.all(resultPromises);
      return this.datatransService.urlToLocal(result, resultType);
    } catch (error) {
      // 如果有任何一个请求失败，这里会捕获到错误
      console.error('调用ali-imageEnhan时，至少有一个文件处理失败:', error);
      // 返回空数组或自定义错误信息
      return [];
    }
  }
  
}
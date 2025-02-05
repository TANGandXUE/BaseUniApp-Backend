import { Controller, Get, HttpException, HttpStatus, Logger, Post, Render, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../service/upload/upload.service';
import { SqlService } from '../../../sql/service/sql/sql.service';
import { UploadService as ApiUploadService } from 'src/module/api/service/upload/upload.service';
import { OssService } from 'src/module/sql/service/oss/oss.service';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
// import { Params } from '@alicloud/openapi-client';
import { ChatqwenService } from 'src/module/api/service/chatqwen/chatqwen.service';
import { MeituautoService } from 'src/module/api/service/meituauto/meituauto.service';
import { JwtAuthGuard } from '../../others/jwt-auth.guard';
import sharp from 'sharp';
import * as path from 'path';

let fileInfos: Array<{ fileName: string, filePath: string }> = [];
let fileInfos_url: Array<{ fileName: string, fileURL: string }> = [];

const logger = new Logger();

@Controller('/user/upload')
export class UploadController {


    constructor(
        private uploadService: UploadService,
        private sqlService: SqlService,
        private apiUploadService: ApiUploadService,
        private datatransService: DatatransService,
        private ossService: OssService,
        private chatqwenService: ChatqwenService,
        private meituautoService: MeituautoService
    ) { }

    @Get()
    @Render('user/upload')
    hello() {
        console.log('测试');
    }

    // 上传文件
    @Post()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('file'))
    async upload(@UploadedFiles() files): Promise<any> {
        try {
            // 写入文件并重命名重名文件
            fileInfos = await this.ossService.reNameFileInfos(
                await this.uploadService.writeFiles(files)
            )
            // 写入OSS
            fileInfos_url = await this.ossService.uploadFiles(fileInfos);
            // 转换图片格式
            const responseData = await this.datatransService.img2img(fileInfos_url,
                {
                    outputFormat: 'jpg',
                    quality: 100,
                }
            )
            fileInfos_url = responseData.data;
            console.log("fileInfos_url:", fileInfos_url);
            if (fileInfos_url[0] !== undefined) {
                return fileInfos_url;
            } else {
                console.log('图片上传失败');
                throw new HttpException('图片上传失败', HttpStatus.BAD_REQUEST);
            }
        } catch (e) {
            console.log(e);
            throw new HttpException('上传文件时，出现了未知错误', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // 转换图片类型
    @Post('img2img')
    @UseGuards(JwtAuthGuard)
    async img2img(@Req() req) {
        try {
            // 转换图片格式
            const responseData = await this.datatransService.img2img(req.body.fileInfos_url, { outputFormat: req.body.outputFormat, quality: req.body.quality });
            fileInfos_url = responseData.data;
            return { isSuccess: true, message: '图片格式转换成功', data: fileInfos_url };
        } catch (error) {
            console.log(error);
            return { isSuccess: false, message: '图片格式转换失败', data: error };
        }
    }

    // 自然语言转参数
    @Post('txt2params') // txtToParams
    @UseGuards(JwtAuthGuard)
    async txt2params(@Req() req) {
        // 总参数列表
        const params: any = {};
        let status: boolean = true;

        // 调用meituauto接口
        params['meituauto'] = await this.chatqwenService.txt2param(req.body.inputText, "meituauto", {}, 0);
        if (Object.keys(params['meituauto']).length === 0) status = false;
        // 调用其他接口...


        // 返回总参数列表
        console.log(params);

        return { status, params };
    }

    // 图形处理
    @Post('imgProcess')
    @UseGuards(JwtAuthGuard)
    async imgProcess(@Req() req) {

        // 初始化参数列表
        let params: any = req.body.params;
        let inputFileInfos_url = req.body.fileInfos_url;
        let result_fileInfos_url: any;
        let errorInfos: Array<{ fromAPI: string, message: Array<any> }> = [];

        // object.key == object['key']

        // 调用meituauto接口------------------------------------------------
        // 定义一个封装了MeituAuto的Promise
        const meituAutoPromise = new Promise((resolve, reject) => {
            this.meituautoService.meitu_auto(inputFileInfos_url, params.meituauto, false, (results_url, message) => {
                // 如果存在错误，写入errorInfos
                if (message.length > 0) {
                    errorInfos.push({
                        fromAPI: 'meituAuto',
                        message,
                    })
                }
                if (results_url) {
                    console.log('meituauto执行结束: ', results_url);

                    this.datatransService.urlToLocal(results_url, 'jpg').then(fileInfos => {
                        // console.log(fileInfos);
                        resolve(fileInfos);
                    }).catch(err => {
                        reject(err);
                    });
                } else {
                    reject(new Error('meituauto执行后未返回结果'));
                }
            })
        });
        //调用MeituAutoPromise
        try {
            //调用MeituAutoPromise并上传到oss返回链接
            let res: any = await meituAutoPromise;
            result_fileInfos_url = await this.ossService.uploadFiles(await this.ossService.reNameFileInfos(res));
        } catch (err) {
            console.error('meituauto执行出错: ', err);
            throw new HttpException('图形处理出错', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // 调用其他接口-----------------------------------------------------




        // 返回result_fileInfos_url
        return { result_fileInfos_url, errorInfos };
    }


    // 图形压缩
    @Post('imgCompress')
    @UseGuards(JwtAuthGuard)
    async imgCompress(@Req() req) {

        logger.error('这里执行到了');
        // 初始化赋值
        fileInfos_url = req.body.fileInfos_url;
        const quality = req.body.quality;
        // let compressedCount = 0;

        logger.error(`fileInfos_url: ${JSON.stringify(fileInfos_url)}, quality: ${quality}, type of quality: ${typeof quality}`)

        try {

            // 将url转换为本地文件
            fileInfos = await this.datatransService.urlToLocal(fileInfos_url, 'jpg');
            logger.error(`fileInfos: ${JSON.stringify(fileInfos)}`);


            const startCompress = fileInfos.map(async (fileInfo) => {

                // 分割路径并给出新路径
                const { dir, name, ext } = path.parse(fileInfo.filePath);
                const outputFileName = `${name}_preview${ext}`;
                const outputFilePath = path.join(dir, outputFileName);
                await sharp(fileInfo.filePath).jpeg({ quality }).toFile(outputFilePath);
                fileInfo.fileName = outputFileName;
                fileInfo.filePath = outputFilePath;
                logger.error(`已处理`)
            });

            await Promise.all(startCompress);
            console.log("fileInfos:", fileInfos);
            const return_fileInfos_url = await this.ossService.uploadFiles(fileInfos);

            // 删除本地文件
            await this.datatransService.deleteFileInfos(fileInfos);
            
            return { isSuccess: true, message: '图片压缩成功', data: return_fileInfos_url };

        } catch (e) {
            logger.error(e);
            throw new HttpException('图片压缩时，出现了未知错误', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }




    // // 旧版方法
    // @Post('uploadfiles')
    // @UseInterceptors(FilesInterceptor('pic'))
    // async uploadFiles(@Body() body, @UploadedFiles() files, @Req() req) {

    //     //写入文件，返回异步文件信息
    //     let fileInfos = await this.uploadService.writeFiles(files);

    //     //给重命名文件加后缀，防止覆盖上传
    //     let NoRenameFileInfos = await this.ossService.reNameFileInfos(fileInfos);

    //     //写入OSS
    //     let fileInfos_url = await this.ossService.uploadFiles(NoRenameFileInfos);

    //     let fileInfos_jpg_url = await this.datatransService.img2img(fileInfos_url,
    //         {
    //             outputFormat: 'jpg',
    //             quality: 100,
    //         }
    //     )

    //     console.log('此处的fileInfos_jpg_url: ', fileInfos_jpg_url);


    //     // 调用qwen处理自然语言成meituauto参数
    //     const responseParams = await this.chatqwenService.txt2param(req.body.inputText, "meituauto");

    //     // 定义一个封装了MeituAuto的Promise
    //     const meituAutoPromise = new Promise((resolve, reject) => {
    //         this.meituautoService.meitu_auto(fileInfos_jpg_url, responseParams, (results_url) => {
    //             if(results_url) {
    //                 console.log('meituauto执行结束: ', results_url);

    //                 this.datatransService.urlToLocal(results_url, 'jpg').then(fileInfos => {
    //                     // console.log(fileInfos);
    //                     resolve(fileInfos);
    //                 }).catch(err => {
    //                     reject(err);
    //                 });
    //             } else {
    //                 reject(new Error('meituauto执行后未返回结果'));
    //             }
    //         })
    //     });

    //     let result_fileInfos: any = [];

    //     //调用MeituAutoPromise
    //     try{
    //         result_fileInfos = await meituAutoPromise;
    //         // const fileInfos_base64 = await this.datatransService.filetoBase64(result_fileInfos);
    //         console.log('fileInfos_base64: ', result_fileInfos);

    //         //上传到oss返回链接
    //         const res_fileInfos_url = await this.ossService.uploadFiles( await this.ossService.reNameFileInfos(result_fileInfos));

    //         return res_fileInfos_url ;
    //     } catch(err) {
    //         console.error('meituauto执行出错: ', err);
    //         return ;
    //     }

    // }

}

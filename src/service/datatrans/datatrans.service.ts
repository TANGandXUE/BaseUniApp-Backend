import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { promisify } from 'util';
import { OssService } from 'src/module/sql/service/oss/oss.service';
const CloudConvert = require('cloudconvert');
const fsUnlink = promisify(fs.unlink);
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class DatatransService {

    constructor(private readonly ossService: OssService) { }

    // 公共参数
    timeout_img2img = Number(process.env.IMG2IMG_TIMEOUT || 60000)

    // 输入包含media_data属性的base64编码信息，返回包含media_data属性的file对象
    async base64toFile(base64_info_list) {

        console.log('base64_info_ilst: ', base64_info_list);

        const promises = base64_info_list.map(async (base64_info) => {
            if (base64_info.media_data) {
                const image_buffer = Buffer.from(base64_info.media_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                try {
                    const imageBuffer = await sharp(image_buffer)
                        .toFormat('jpeg')
                        .toBuffer();
                    return imageBuffer;
                } catch (error) {
                    console.error('Error processing image:', error);
                }
            }
        });

        const buffer_list = await Promise.all(promises);
        return buffer_list;
    }


    // 将fileInfos(含本地路径)转换成fileInfos(含base64编码)
    async filetoBase64(fileInfos: Array<{ fileName: string, filePath: string }>) {
        const fileInfos_base64 = fileInfos.map(async (fileInfo) => {
            const buffer = await fs.readFileSync(fileInfo.filePath);

            let contentType: any;

            if (fileInfo.fileName.split('.').pop() === 'jpg') {
                contentType = 'image/jpeg';
            } else {
                contentType = `image/${fileInfo.fileName.split('.').pop()}`;
            }

            return {
                fileName: fileInfo.fileName,
                contentType,
                fileBase64: buffer.toString('base64'),
            }
        })

        return await Promise.all(fileInfos_base64);
    }

    // 删除本地文件
    public async deleteFileInfos(fileInfos: Array<{ fileName: string, filePath: string }>): Promise<{ isSuccess: boolean, message: string, data: any }> {
        const failedDeletions: string[] = []; // 用于收集删除失败的文件信息

        for (const fileInfo of fileInfos) {
            try {
                await fs.promises.unlink(fileInfo.filePath); // 尝试删除文件
            } catch (error) {
                // 如果删除失败，记录该文件的信息
                failedDeletions.push(`Failed to delete ${fileInfo.fileName} at path ${fileInfo.filePath}: ${error.message}`);
            }
        }

        // 根据是否有失败的删除操作决定返回值
        if (failedDeletions.length === 0) {
            return { isSuccess: true, message: "All files deleted successfully.", data: null };
        } else {
            const errorMessage = JSON.stringify(failedDeletions); // 转换失败信息为JSON字符串
            return { isSuccess: false, message: `Some files failed to delete: ${errorMessage}`, data: null };
        }
    }

    // 将windows路径转换为linux路径
    convertWindowsSlashes(windowsPathArray: string[]): string[] {
        return windowsPathArray.map(path => path.replace(/\\/g, '/'));
    }

    // fileInfos(含URL)转换成fileInfos(含本地路径)
    async urlToLocal(fileInfos_url: Array<{ fileName: string, fileURL: string }>, fileType: string): Promise<Array<{ fileName: string; filePath: string }>> {
        const downloadDir = 'public/user/download/';
        // 确保下载目录存在
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const downloadPromises = fileInfos_url.map(async ({ fileName, fileURL }) => {
            // 提取文件名和扩展名
            const baseNameWithoutExt = path.basename(fileName, path.extname(fileName));
            const localFilePath = path.join(downloadDir, `${baseNameWithoutExt}.${fileType}`);

            console.log('本地文件路径为: ', localFilePath);

            try {
                const response = await axios({
                    method: 'GET',
                    url: fileURL,
                    responseType: 'stream',
                    maxRedirects: 5, // 可以调整重定向的最大次数
                });

                const file = fs.createWriteStream(localFilePath);

                response.data.pipe(file);

                await new Promise((resolve) => {
                    file.on('finish', () => {
                        file.close(resolve);
                    });
                });

                return { fileName, filePath: localFilePath };
            } catch (error) {
                await fsUnlink(localFilePath); // 删除已开始下载但未完成的文件
                throw error;
            }
        });

        try {
            const localFileInfos = await Promise.all(downloadPromises);
            console.log('localFileInfos: ', localFileInfos);
            return localFileInfos;
        } catch (error) {
            console.error('下载过程中发生错误:', error);
            throw error;
        }
    }


    // 识别图像类型并转换为png格式
    async convertToPng(fileInfos: Array<{ fileName: string, filePath: string }>): Promise<{ resultFileName: string, resultFilePath: string }[]> {
        const result: Array<{ resultFileName: string, resultFilePath: string }> = [];

        // 使用Promise.all并行处理所有文件转换
        await Promise.all(fileInfos.map(async (fileInfo) => {
            const { fileName, filePath } = fileInfo;
            // 检查文件是否为非png格式
            if (!fileName.toLowerCase().endsWith('.png')) {
                // 构建新的文件名和路径
                const fileExt = fileName.split('.').pop();
                console.log('fileExt: ', fileExt);
                const newFileName = `${fileName.slice(0, -fileExt.length - 1)}.png`;
                console.log('newFileName: ', newFileName);
                const newFilePath = filePath.replace(/\.([a-z]+)$/i, '.png');
                console.log('newFilePath: ', newFilePath);

                try {
                    // 使用sharp转换图像格式
                    await sharp(filePath)
                        .toFormat('png')
                        .toFile(newFilePath);

                    // 将转换后的信息存入结果数组
                    result.push({ resultFileName: newFileName, resultFilePath: newFilePath });
                } catch (error) {
                    console.error(`转换文件${filePath}时出错：`, error);
                }
            } else {
                result.push({ resultFileName: fileName, resultFilePath: filePath });
            }

        }));

        return result; // 所有文件转换完成后返回结果数组
    }


    // 调用了CloudConvert服务商的图片转档服务
    cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_KEY);
    async img2img(fileInfos_url: Array<{ fileName: string, fileURL: string }>, params: { outputFormat: string, quality: number }): Promise<{ isSuccess: boolean, message: string, data: any }> {
        console.log('fileInfos_url: ', fileInfos_url);
        let isSuccess: boolean = true;
        let errorInfos: Array<string> = [];


        // 创建一个用于存储所有job promise的数组
        const jobPromises = fileInfos_url.map(async (fileInfo_url) => {
            console.log('拓展名为：', path.extname(fileInfo_url.fileName).toLowerCase().substring(1));
            // console.log('fileName: ', fileInfo_url.fileName);
            console.log({
                a: path.extname(fileInfo_url.fileName).toLowerCase().substring(1),
                b: params.outputFormat,
                c: params.quality,
            });

            //如果输入拓展名和输出的一样，则随便定义一个固定的jobID，直接返回，意思就是不用修图了
            if (path.extname(fileInfo_url.fileName).toLowerCase().substring(1) === params.outputFormat) {
                return { jobId: 100100100, fileInfo_url };
            };

            const job = await this.cloudConvert.jobs.create({
                tasks: {
                    importFile: {
                        operation: "import/url",
                        url: fileInfo_url.fileURL,
                    },
                    convertFile: {
                        operation: "convert",
                        input_format: path.extname(fileInfo_url.fileName).toLowerCase().substring(1),
                        output_format: params.outputFormat,
                        engine: "imagemagick",
                        input: "importFile",
                        fit: "max",
                        "width": 3000,
                        "height": 3000,
                        timeout: 60,
                        strip: false,
                        // quality: params.quality,
                    },
                    exportFile: {
                        operation: "export/url",
                        input: "convertFile",
                        inline: true,
                        archive_multiple_files: false,
                    },
                },
            });

            console.log('job已上传');

            // 返回一个代表job完成并获取exportUrl的promise
            return { jobId: job.id, fileInfo_url };
        });

        console.log('调用了CloudConvert服务商的图片转档服务fileInfos_url: ', fileInfos_url);

        // 使用Promise.all等待所有job创建完成
        let jobInfoArray: Array<{ jobId: number, fileInfo_url: { fileName: string, fileURL: string } }> = [];
        try {
            jobInfoArray = await Promise.all(jobPromises);
        } catch (error) {
            console.error('创建job时出错：', error);
            if (error.response.status === 422) {
                return { isSuccess: false, message: `图片类型转换错误：输入了不支持的图片类型`, data: [] }
            }
            else return { isSuccess: false, message: `图片类型转换错误，错误代码：${error.response.status}，错误内容：${error.response.statusText}`, data: [] };
        }

        // 对于每个job，启动一个异步操作来等待其完成并获取URL，不阻塞
        const resultPromises = jobInfoArray.map(async ({ jobId, fileInfo_url }) => {

            //如果jobId是我随便定义的那个，那么直接返回，因为原拓展名和输出格式一样，不需要修图
            if (jobId === 100100100) {
                return {
                    fileName: fileInfo_url.fileName,
                    fileURL: fileInfo_url.fileURL
                };
            }

            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error(`ID为 ${jobId} 的图片类型转换任务超时(${this.timeout_img2img / 1000}秒)`));
                }, this.timeout_img2img);
            });

            try {
                // 使用Promise.race等待job完成或超时
                const result = await Promise.race([this.cloudConvert.jobs.wait(jobId), timeoutPromise]);

                if (result instanceof Error) {
                    // 这里意味着是超时错误
                    errorInfos.push(`ID为${jobId}的任务超时(${this.timeout_img2img / 1000}秒)`);
                    console.error(`ID为${jobId}的任务超时, 错误信息：${result.message}`);
                    return { jobId, isSuccess: false, errorMessage: result.message };
                } else {
                    if (result.status === 'error') {
                        errorInfos.push(`ID为${jobId}的任务失败, 错误代码: ${result.tasks[0].code}, 错误信息：${result.tasks[0].message}`);
                        console.log(`ID为${jobId}的任务失败, 错误代码: ${result.tasks[0].code}, 错误信息：${result.tasks[0].message}`);
                        return null;
                    } else {
                        const resultFile = this.cloudConvert.jobs.getExportUrls(result)[0];
                        const resultFileName = `${fileInfo_url.fileName.substring(0, fileInfo_url.fileName.lastIndexOf('.'))}.${params.outputFormat}`;
                        return { fileName: resultFileName, fileURL: resultFile.url };
                    }
                }
            } catch (error) {
                // 这里捕获的是非超时的其他异常
                errorInfos.push(`ID为${jobId}的任务失败, 错误信息：${error.message}`);
                console.error(`ID为${jobId}的任务失败, 错误信息：${error.message}`);
                return null;
            }
        });

        // 等待所有结果处理完成
        try {
            const result_urls = (await Promise.all(resultPromises)).filter(Boolean);
            // console.log('result_urls啊啊啊啊啊啊啊aaaa:', result_urls);
            if (errorInfos.length > 0) {
                if (result_urls.length === 0)   // 没有成功
                    return { isSuccess: false, message: JSON.stringify(errorInfos), data: [] };
                else    // 部分成功
                    return { isSuccess, message: JSON.stringify(errorInfos), data: result_urls };
            }
            else
                return { isSuccess, message: '图片类型转换成功', data: result_urls };
        } catch (error) {
            return { isSuccess: false, message: `图片类型转换错误：${error}`, data: [] };
        }


    }

    // JPEG图像压缩
    async imgCompress(fileInfos_url: Array<{ fileName: string, fileURL: string }>, quality: number) {

        console.log(`fileInfos_url: ${JSON.stringify(fileInfos_url)}, quality: ${quality}, type of quality: ${typeof quality}`)

        try {
            // 将url转换为本地文件
            const fileInfos = await this.urlToLocal(fileInfos_url, 'jpg');
            console.log(`fileInfos: ${JSON.stringify(fileInfos)}`);


            const startCompress = fileInfos.map(async (fileInfo) => {

                // 分割路径并给出新路径
                const { dir, name, ext } = path.parse(fileInfo.filePath);
                const outputFileName = `${name}_preview${ext}`;
                const outputFilePath = path.join(dir, outputFileName);
                await sharp(fileInfo.filePath).jpeg({ quality }).toFile(outputFilePath);
                fileInfo.fileName = outputFileName;
                fileInfo.filePath = outputFilePath;
            });

            await Promise.all(startCompress);
            console.log("fileInfos:", fileInfos);
            const return_fileInfos_url = await this.ossService.uploadFiles(fileInfos);

            // 删除本地文件
            await this.deleteFileInfos(fileInfos);

            return { isSuccess: true, message: '图片压缩成功', data: return_fileInfos_url };

        } catch (e) {
            return { isSuccess: false, message: `图片压缩错误：${e}`, data: [] };
        }
    }

    // JPEG图像压缩, 根据指定最大长宽高压缩
    async imgCompressBySize(fileInfos_url: Array<{ fileName: string, fileURL: string }>, maxWidth: number, maxHeight: number) {

        console.log(`fileInfos_url: ${JSON.stringify(fileInfos_url)}, maxWidth: ${maxWidth}, maxHeight: ${maxHeight}`);

        try {
            // 将url转换为本地文件
            const fileInfos = await this.urlToLocal(fileInfos_url, 'jpg');
            console.log(`fileInfos: ${JSON.stringify(fileInfos)}`);

            const startCompress = fileInfos.map(async (fileInfo) => {

                // 分割路径并给出新路径
                const { dir, name, ext } = path.parse(fileInfo.filePath);
                const outputFileName = `${name}_preview${ext}`;
                const outputFilePath = path.join(dir, outputFileName);

                // 使用resize方法按最大宽度和高度压缩，避免图片放大
                await sharp(fileInfo.filePath)
                    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true }) // fit: 'inside' 保持原图比例缩放至指定尺寸内
                    .jpeg() // 依然转换为JPEG格式
                    .toFile(outputFilePath);

                fileInfo.fileName = outputFileName;
                fileInfo.filePath = outputFilePath;
            });

            await Promise.all(startCompress);
            console.log("fileInfos:", fileInfos);
            const return_fileInfos_url = await this.ossService.uploadFiles(fileInfos);

            // 删除本地文件
            await this.deleteFileInfos(fileInfos);

            return { isSuccess: true, message: '图片压缩成功', data: return_fileInfos_url };

        } catch (e) {
            return { isSuccess: false, message: `图片压缩错误：${e}`, data: [] };
        }
    }

    // JPEG图像压缩, 根据指定最大像素
    async imgCompressByMaxPixels(fileInfos_url: Array<{ fileName: string, fileURL: string }>, maxPixels: number) {

        console.log(`fileInfos_url: ${JSON.stringify(fileInfos_url)}, maxPixels: ${maxPixels}`);

        try {
            // 将url转换为本地文件
            const fileInfos = await this.urlToLocal(fileInfos_url, 'jpg');
            console.log(`fileInfos: ${JSON.stringify(fileInfos)}`);

            const startCompress = fileInfos.map(async (fileInfo) => {

                // 分割路径并给出新路径
                const { dir, name, ext } = path.parse(fileInfo.filePath);
                const outputFileName = `${name}_preview${ext}`;
                const outputFilePath = path.join(dir, outputFileName);

                // 获取图片长宽高，然后根据最大像素，计算分配到的长度和宽度
                // 获取图片长宽高
                const metadata = await sharp(fileInfo.filePath).metadata();
                const { width, height } = metadata;
                let maxWidth: number = 0;
                let maxHeight: number = 0;

                // 计算原图片的像素数
                const originalPixels = width * height;

                // 根据最大像素，计算分配到的长度和宽度
                let scale = 1;
                if (originalPixels > maxPixels) {
                    // 计算缩放比例
                    scale = Math.sqrt(maxPixels / originalPixels);
                    // 应用缩放比例
                    maxWidth = Math.floor(width * scale);
                    maxHeight = Math.floor(height * scale);
                    console.log(`Original dimensions: ${width}x${height}, New dimensions: ${maxWidth}x${maxHeight}`);
                    console.log(`maxWidth: ${maxWidth}, maxHeight: ${maxHeight}`);

                    // 使用resize方法按计算出的新宽度和高度压缩，避免图片放大
                    await sharp(fileInfo.filePath)
                        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
                        .jpeg()
                        .toFile(outputFilePath);
                    fileInfo.fileName = outputFileName;
                    fileInfo.filePath = outputFilePath;
                } else {
                    // 如果图片像素数小于等于maxPixels，直接保存原图
                    fileInfo.fileName = outputFileName;
                    fileInfo.filePath = fileInfo.filePath;
                }


            });

            await Promise.all(startCompress);
            console.log("fileInfos:", fileInfos);
            const return_fileInfos_url = await this.ossService.uploadFiles(fileInfos);

            // 删除本地文件
            await this.deleteFileInfos(fileInfos);

            return { isSuccess: true, message: '图片压缩成功', data: return_fileInfos_url };

        } catch (e) {
            return { isSuccess: false, message: `图片压缩错误：${e}`, data: [] };
        }
    }

}
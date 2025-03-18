import { Injectable } from '@nestjs/common';
import OSS from 'ali-oss';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();
import { promisify } from 'util'; // 引入promisify用于转换异步回调函数为Promise
const writeFile = promisify(require('fs').writeFile); // 将writeFile转换为Promise版本

@Injectable()
export class OssService {
    private client: OSS;

    constructor() {
        this.client = new OSS({
            region: process.env.OSS_REGION,
            accessKeyId: process.env.OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
            bucket: process.env.OSS_BUCKET,
        });
    }

    // 初始化OSS客户端。请将以下参数替换为您自己的配置信息。
    ossConfig: any = {
        region: process.env.OSS_REGION, // 示例：'oss-cn-hangzhou'，填写Bucket所在地域。
        accessKeyId: process.env.OSS_ACCESS_KEY_ID, // 确保已设置环境变量OSS_ACCESS_KEY_ID。
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, // 确保已设置环境变量OSS_ACCESS_KEY_SECRET。
        bucket: process.env.OSS_BUCKET, // 示例：'my-bucket-name'，填写存储空间名称。
        dir: "userUpload/", // 示例：'userUpload/'，填写文件上传目录，以'/'结尾。
    }
    max_file_size: number = Number(process.env.OSS_MAX_FILE_SIZE || 1048576000);

    //上传文件到OSS
    async uploadFiles(fileInfos: Array<{ fileName: string, filePath: string }>) {

        let results_url = [];

        try {
            for (const fileInfo of fileInfos) {
                // 上传文件到OSS
                const uploadResult = await this.client.put(fileInfo.fileName, fileInfo.filePath);

                // 将URL转换为HTTPS
                let httpsUrl = uploadResult.url.replace(/^http:/, 'https:');

                try {
                    // 使用axios检查HTTPS URL是否可达
                    await axios.head(httpsUrl);
                    // 如果没有抛出异常，则URL可达，将其存储在results_url中
                    results_url.push({ fileName: fileInfo.fileName, fileURL: httpsUrl });
                } catch (error) {
                    // 如果URL不可达，存储原始URL
                    console.error(`HTTPS URL ${httpsUrl} is not accessible:`, error);
                    results_url.push({ fileName: fileInfo.fileName, fileURL: uploadResult.url });
                }
            }
        }
        catch (error) {
            console.error('上传文件到OSS错误:', error);
            // 在此处添加错误处理逻辑。
        }

        console.log('上传文件后的results_url: ', results_url);
        return results_url;

    }

    // 从OSS下载文件
    async downloadFiles(fileInfos: Array<{ fileName: string }>) {

        const downloadFileInfos: Array<{ fileName: string, localFilePath: string }> = []; // 创建存储文件信息的数组

        try {
            for (const fileInfo of fileInfos) {
                // 从OSS下载文件以验证上传成功。
                const getResult = await this.client.get(fileInfo.fileName);
                // console.log('从OSS下载文件成功，Tag为: ', getResult.res.headers.etag);
                // console.log('从OSS下载文件成功，buffer为: ', getResult.res.data);

                console.log('getResult', getResult); ``

                const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '-');
                const localFilePath = `public/sql/oss/${currentDate}-${fileInfo.fileName}.jpeg`;

                // 将Buffer写入到本地文件
                await writeFile(localFilePath, getResult.res.data, 'binary');
                // console.log(`文件已保存至: ${localFilePath}`);

                // 文件写入成功后，将信息添加到数组
                downloadFileInfos.push({ fileName: fileInfo.fileName, localFilePath });

            }
        }
        catch (error) {
            console.error('从OSS下载文件错误:', error);
            // 在此处添加错误处理逻辑。
        }

        return downloadFileInfos;
    }


    // 判断文件是否存在
    async isExistObject(name: string) {
        try {
            await this.client.head(name);
            // console.log('文件存在')

            return true;
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                //   console.log('文件不存在:', error)
                return false;
            }
            console.log('判断文件是否存在时抛出异常错误：', error);
            return false;
        }
    }


    // 重命名重名的文件
    async reNameFileInfos(fileInfos: any[]): Promise<any[]> {
        const NoRenameFileInfos: any[] = []; // 初始化不重命名的文件信息数组
        for (const fileInfo of fileInfos) {
            let fileName = fileInfo.fileName;
            let suffix = 1; // 初始化后缀为1，避免使用字符串操作

            // 循环直到找到一个唯一的文件名
            while (true) {
                const exists = await this.isExistObject(fileName); // 检查文件名是否存在
                if (!exists) {
                    // 如果文件名不存在，则跳出循环
                    break;
                }
                // 文件名存在，增加后缀并尝试下一个
                fileName = `${fileInfo.fileName.split('.')[0]}-${suffix}.${fileInfo.fileName.split('.')[1]}`; // 保持原始文件扩展名，并添加后缀
                suffix++; // 直接递增后缀，不需要检查是否为'-1'
            }

            // 将处理后的文件名与原filePath组合成新对象，并push进NoRenameFileInfos
            NoRenameFileInfos.push({ fileName, filePath: fileInfo.filePath });
        }

        return NoRenameFileInfos;
    }

    // 重命名重名的文件(仅输入fileName)
    async reNameFileName(fileName: string): Promise<string> {
        // 分割文件名和扩展名，确保使用最后一个"."来获取真正的扩展名
        const parts = fileName.split('.');
        const extension = `.${parts.pop()}`; // 获取最后一个部分作为扩展名
        const baseName = parts.join('.'); // 剩余部分组成基础文件名

        let suffix = 1; // 初始化后缀为1
        let fullFileName: string; // 在循环外定义 fullFileName
        let newNameBase: string;

        // 循环直到找到一个唯一的文件名
        while (true) {
            newNameBase = suffix > 1 ? `${baseName}-${suffix}` : baseName; // 添加后缀到基础文件名，如果需要的话
            fullFileName = this.ossConfig.dir + newNameBase + extension; // 在循环内更新 fullFileName 的值
            console.log('fullFileName: ', fullFileName);
            const exists = await this.isExistObject(fullFileName); // 检查文件名是否存在
            console.log('是否存在: ', exists);
            if (!exists) {
                // 如果文件名不存在，则跳出循环
                break;
            }
            // 文件名存在，增加后缀并尝试下一个
            suffix++; // 递增后缀
        }

        // 返回最终的唯一文件名
        return newNameBase + extension; // 现在可以正确返回 fullFileName
    }


    // 生成Post签名和Post Policy
    async getSignature(): Promise<any> {
        const expiresInSeconds = Number(process.env.OSS_EXPIRES || '3600');
        let dir: any = undefined;
        if (this.ossConfig.dir) dir = this.ossConfig.dir;
        const client = this.client;
        const date = new Date();
        date.setSeconds(date.getSeconds() + expiresInSeconds);

        const policy = {
            expiration: date.toISOString(),
            conditions: [
                ["content-length-range", 0, this.max_file_size], // 示例：文件大小限制为0到100MB
                { bucket: client.options.bucket }, // 限制上传到指定Bucket
                // ['starts-with', '$Content-Type', 'image/'],
            ],
        };

        if (dir) policy.conditions.push(['starts-with', '$key', dir]); // 添加前缀条件

        const formData = await client.calculatePostSignature(policy);
        const host = `https://${client.options.bucket}.${(await client.getBucketLocation()).location}.aliyuncs.com`;

        return {
            policy: formData.policy,
            signature: formData.Signature,
            ossAccessKeyId: formData.OSSAccessKeyId,
            host,
            dir,
        };
    }


}

import { Injectable } from '@nestjs/common';
import { createWriteStream, promises as fsPromises } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
    private fileInfos: Array<{ fileName: string, filePath: string }> = [];

    // 写入文件并返回文件信息
    async writeFiles(files): Promise<Array<{ fileName: string, filePath: string }>> {
        const fileInfos = [];

        const uploadDir = join(__dirname, '../../../../../public/user/upload');
        await fsPromises.mkdir(uploadDir, { recursive: true }); // 如果没有相关文件夹，先创建一个
        for (const file of files) {
            const filePath = join(uploadDir, `${Date.now()}-${file.originalname}`);

            console.log(`开始写入文件: ${filePath}`);

            const writeStream = createWriteStream(filePath);
            writeStream.write(file.buffer);

            // 使用 writeStream.write 的返回结果来确保缓冲区中的数据已经被处理
            if (!writeStream.write(file.buffer)) {
                await new Promise((resolve) => writeStream.once('drain', resolve));
            }

            // 关闭流
            writeStream.end();

            // 添加'finish'事件监听器，等待文件写入完成
            await new Promise((resolve, reject) => {
                writeStream.on('finish', () => {
                    console.log(`文件写入完成: ${filePath}`);
                    resolve(undefined);
                });

                // 添加错误处理
                writeStream.on('error', (error) => {
                    console.error(`文件写入错误: ${filePath}`, error);
                    reject(error);
                });
            });

            fileInfos.push({ fileName: file.originalname, filePath });
        }

        this.fileInfos = fileInfos;
        console.log('this.fileInfos: ', this.fileInfos);
        return fileInfos;
    }
}
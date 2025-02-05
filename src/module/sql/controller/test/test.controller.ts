import { Controller, Get, Render, Res } from '@nestjs/common';
import { OssService } from '../../service/oss/oss.service';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
import { SqlService } from '../../service/sql/sql.service';

@Controller('sql/test')
export class TestController {
    constructor(
        private readonly ossService: OssService,
        private readonly datatransService: DatatransService,
        private readonly sqlService: SqlService
    ) { }

    @Get('oss-upload')
    async ossUploadTest() {

        const fileInfos = [
            {
                fileName: 'test1',
                filePath: 'C:/Users/Administrator/Desktop/temp/new.jpg'
            },
            {
                fileName: 'test2',
                filePath: 'C:/Users/Administrator/Desktop/temp/new2.jpg'
            }
        ];

        await this.ossService.uploadFiles(fileInfos);
    }

    @Get('oss-download')
    async ossDownloadTest() {

        const fileInfos = [
            {
                fileName: 'test1',
                filePath: ''
            },
            {
                fileName: 'test2',
                filePath: ''
            }
        ];

        const downloadFileInfos = await this.ossService.downloadFiles(fileInfos);

        console.log(downloadFileInfos);
    }

    @Get('url2path')
    async url2path() {
        console.log(await this.datatransService.urlToLocal(
            [
                {
                    fileName: 'test2',
                    fileURL: 'http://vibktprfx-prod-prod-damo-eas-cn-shanghai.oss-cn-shanghai.aliyuncs.com/enhance-img-color/2024-05-18/d6535ea5-cf50-40da-b5f2-3f5102dc6f4f/20240518_233007729457_dncfsirjt4.jpg?Expires=1716048007&OSSAccessKeyId=LTAI4FoLmvQ9urWXgSRpDvh1&Signature=U4m%2B%2Bgzl6Fm5jFqY1Au7ZZqx%2Bmc%3D'
                }
            ],
            "jpg"
        ))
    }

    @Get('img2png')
    async img2png() {
        console.log(await this.datatransService.convertToPng(
            [
                {
                    fileName: 's.webp',
                    filePath: 'C:/Users/Administrator/Desktop/temp/s.webp'
                }
            ]
        ))
    }

    @Get('img2img')
    async img2img() {
        const taskId = Date.now().toString(); // 生成一个唯一的任务ID
        this.datatransService.img2img(
            [
                {
                    fileName: 'test.ARW',
                    fileURL: 'http://clouddreamai.oss-cn-shanghai.aliyuncs.com/KKK02327.ARW'
                },
                {
                    fileName: 'test2.ARW',
                    fileURL: 'http://clouddreamai.oss-cn-shanghai.aliyuncs.com/KKK02327.ARW'
                },
                {
                    fileName: 'test3.ARW',
                    fileURL: 'http://clouddreamai.oss-cn-shanghai.aliyuncs.com/KKK02327.ARW'
                },
                {
                    fileName: 'test4.ARW',
                    fileURL: 'http://clouddreamai.oss-cn-shanghai.aliyuncs.com/KKK02327.ARW'
                }

            ],
            {
                outputFormat: 'png',
                quality: 100,
            }
        );

    }

    @Get('url2local')
    async url2local() {
        console.log(await this.datatransService.urlToLocal(
            [
                {
                    fileName: 'test-7.jpg',
                    fileURL: 'http://us-east.storage.cloudconvert.com/tasks/5ca4358b-e52d-42d5-a63e-027273913148/new4.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=cloudconvert-production%2F20240525%2Fva%2Fs3%2Faws4_request&X-Amz-Date=20240525T075510Z&X-Amz-Expires=86400&X-Amz-Signature=a039dbe8bef176876ef6a166c310ed356fc3f64fb7abeb6c806b6db71880d0e4&X-Amz-SignedHeaders=host&response-content-disposition=inline%3B%20filename%3D%22new4.jpg%22&response-content-type=image%2Fjpeg&x-id=GetObject'
                }
            ], 'jpg'
        ))
    }

    @Get('findUserName')
    async findUserName(){
        console.log(await this.sqlService.elementExist('userName', 'TANGXUE'));
    }


    @Get('deductpoints')
    async deductPoints(){
        console.log(await this.sqlService.deductPoints('18001633139', '', 10));
    }

    @Get('addpoints')
    async addPoints(){
        console.log(await this.sqlService.addPoints('18001633139', '', 10));
    }

}

import { Controller, Get } from '@nestjs/common';
import { UploadService } from '../../service/upload/upload.service';
import { MeituautoService } from '../../service/meituauto/meituauto.service';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
import { ChatqwenService } from '../../service/chatqwen/chatqwen.service';
import { AlimsgService } from '../../service/alimsg/alimsg.service';

@Controller('api/api')
export class ApiController {

    constructor(
        private readonly uploadService: UploadService,
        private readonly datatransService: DatatransService,
        private readonly meituautoService: MeituautoService,
        private readonly chatqwenService: ChatqwenService,
        private readonly alimsgService: AlimsgService
    ) { }

    @Get('test-meitu-filter')
    async test() {
        try {
            const result = await this.uploadService
                .meitu_filter(
                    '9762db76d31a4f89a415c1ea8556c988',
                    'a7aba72070bb4861934502e9e50637b6',
                    [
                        'C:/Users/Administrator/Desktop/temp/new2.jpg',
                        'C:/Users/Administrator/Desktop/temp/new3.jpg',
                        'C:/Users/Administrator/Desktop/temp/new4.jpg',
                    ],
                    {
                        "filterType": "Fa0145JwLfwjjbch",
                        "filterAlpha": 70,
                        "beautyAlpha": 0,
                        "rsp_media_type": "base64"
                    }
                );

            console.log(result);
            if (result.data.media_info_list.length > 0) {
                console.log('media_info_list中有数据');
            } else {
                console.log('media_info_list中没有数据');
            }

            const bufferList = await this.datatransService.base64toFile(result.data.media_info_list);
            if (bufferList.length > 0) {
                console.log('base64toFile转换成功');
            } else {
                console.log('base64toFile转换失败');
            }

            return '操作成功';
        } catch (error) {
            console.error(error);
            return '操作失败';
        }
    }

    @Get('test-ali-imageenhan')
    async imageenhan() {
        console.log(await this.uploadService.ali_imageEnhan(
            [{
                fileName: 'new.jpg',
            }],
            "png"
        ))
    }

    @Get('test-meitu-auto')
    async meituauto() {
        await this.meituautoService.meitu_auto(
            [
                // {
                //     fileName: 'test-1.jpg',
                //     fileURL: 'https://clouddreamai.oss-cn-shanghai.aliyuncs.com/new-11.jpg',
                // },
                {
                    fileName: '8.jpg',
                    fileURL: 'https://clouddreamai.oss-cn-shanghai.aliyuncs.com/8.jpg',
                }
            ],
            {
                bright_low_dark_image_flag: 1,
                awb_norm_coef: 50,
                exposure_norm_coef: 50,
                dehaze_coef: 50,
                face_beauty_alpha: [80, 80, 80, 80, 80],
                face_restore_alpha: [50, 50, 50, 50, 50],
            },
            false,
            (fileInfos_url) => {
                console.log('meituauto执行结束: ', fileInfos_url);
            }
        );
    }

    @Get('test-chatqwen')
    async chatqwen() {
        const response = await this.chatqwenService.txt2param(
            '光线调整一下，人脸修一修，别修太多。', 'meituauto', {}, 0
        )
        console.log(response);
    }

    @Get('test-alimsg')
    async alimsg() {
        const response = await this.alimsgService.sendPhoneMsg(
            "19102147124",
            "云梦智联",
            "SMS_468015004",
        )
        console.log(response);
    }
}


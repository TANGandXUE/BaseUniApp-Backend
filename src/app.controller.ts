import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatatransService } from './service/datatrans/datatrans.service';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly datatransService: DatatransService

  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-filetobase64')
  async filetobase64() {
    console.log(await this.datatransService.filetoBase64(
      [
        {
          fileName: 'meituauto-4-1.jpg',
          filePath: 'public\\user\\download\\meituauto-4-1.jpg'
        }
      ]
    ))
  }

  @Get('test-img2img')
  async img2img() {
    const response = await this.datatransService.img2img(
      [
        {
          fileName: "15e19b07-c052-445a-9d09-c25e4d099b5a.png",
          fileURL: "https://clouddreamai.oss-cn-shanghai.aliyuncs.com/img/15e19b07-c052-445a-9d09-c25e4d099b5a.png",
        },
      ],
      {
        outputFormat: 'jpg',
        quality: 100,
      }
    );
    console.log(response);
  }

  @Get('text-ext')
  async ext() {
    console.log(path.extname('com.combraers.exts.jpg').toLowerCase().substring(1));
  }
}

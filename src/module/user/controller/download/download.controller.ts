import { Controller, Get, Render } from '@nestjs/common';

@Controller('download')
export class DownloadController {

    @Get()
    @Render('user/upload')
    download() {
        
    }
}

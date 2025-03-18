import { Controller, Post, Body } from '@nestjs/common';
import { AsrService } from '../../service/asr/asr.service';

@Controller('api/asr')
export class AsrController {
    constructor(
        private readonly asrService: AsrService
    ) { }

    /**
     * 提交语音识别任务
     */
    @Post('transcribe')
    async transcribe(@Body() body: { fileUrls: string[] }): Promise<any> {
        return await this.asrService.submitTranscriptionTask(body.fileUrls);
    }
}

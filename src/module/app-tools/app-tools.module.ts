import { Module } from '@nestjs/common';
import { DigitalHumanController } from './controller/digital-human/digital-human.controller';
import { DigitalHumanService } from './service/digital-human/digital-human.service';
import { AppsModule } from '../apps/apps.module';
import { AppListService } from '../apps/service/app-list/app-list.service';
import { SqlModule } from '../sql/sql.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apps } from 'src/entities/apps.entity';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { FacefusionController } from './controller/facefusion/facefusion.controller';
import { FacefusionService } from './service/facefusion/facefusion.service';
import { ChatController } from './controller/chat/chat.controller';
import { ChatService } from './service/chat/chat.service';
import { MimicmotionController } from './controller/mimicmotion/mimicmotion.controller';
import { MimicmotionService } from './service/mimicmotion/mimicmotion.service';
import { CosyvoiceController } from './controller/cosyvoice/cosyvoice.controller';
import { CosyvoiceService } from './service/cosyvoice/cosyvoice.service';
import { WechatArticleExporterController } from './controller/wechat-article-exporter/wechat-article-exporter.controller';
import { WechatArticleExporterService } from './service/wechat-article-exporter/wechat-article-exporter.service';
import { HttpModule } from '@nestjs/axios';
import { WechatOfficial } from 'src/entities/bindAccounts/wechatOfficial.entity';
import { CookieManagerService } from '../user/service/cookie/cookie-manager.service';
import { CozeService } from './service/coze/coze.service';
import { CozeGateway } from './gateway/coze/coze.gateway';
import { CozeController } from './controller/coze/coze.controller';
import { CozeAuthService } from './service/coze/coze-auth.service';
import { KnowledgeController } from './controller/knowledge/knowledge.controller';
import { KnowledgeService } from './service/knowledge/knowledge.service';
import { Knowledge } from 'src/entities/apps/knowledge/knowledge.entity';
import { SearchController } from './controller/search/search.controller';
import { SearchService } from './service/search/search.service';
import { PixverseController } from './controller/pixverse/pixverse.controller';
import { PixverseService } from './service/pixverse/pixverse.service';
import { ApiController } from './controller/chat/api/api.controller';
import { ApiService } from './service/chat/api/api.service';
import { ApiKey } from 'src/entities/apps/chat/apiKey.entity';
import { ApiChatController } from './controller/chat/api-chat/api-chat.controller';
import { ApiChatService } from './service/chat/api-chat/api-chat.service';
import { LtxvideoController } from './controller/ltxvideo/ltxvideo.controller';
import { LtxvideoService } from './service/ltxvideo/ltxvideo.service';
import { CosyvoiceAliyunController } from './controller/cosyvoice-aliyun/cosyvoice-aliyun.controller';
import { CosyvoiceAliyunService } from './service/cosyvoice-aliyun/cosyvoice-aliyun.service';

@Module({
  imports: [
    AppsModule, 
    SqlModule,
    TypeOrmModule.forFeature([Apps, HistoryInfo, WechatOfficial, Knowledge, ApiKey]),
    HttpModule
  ],
  controllers: [DigitalHumanController, FacefusionController, ChatController, MimicmotionController, CosyvoiceController, WechatArticleExporterController, CozeController, KnowledgeController, SearchController, PixverseController, ApiController, ApiChatController, LtxvideoController, CosyvoiceAliyunController],
  providers: [
    DigitalHumanService, 
    AppListService, 
    FacefusionService, 
    ChatService, 
    MimicmotionService, 
    CosyvoiceService, 
    WechatArticleExporterService, 
    CookieManagerService, 
    CozeService,
    CozeGateway,
    CozeAuthService,
    KnowledgeService,
    SearchService,
    PixverseService,
    ApiService,
    ApiChatService,
    LtxvideoService,
    CosyvoiceAliyunService
  ],
  exports: [CozeService]
})
export class AppToolsModule {}

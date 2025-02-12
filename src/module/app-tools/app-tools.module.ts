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

@Module({
  imports: [
    AppsModule, 
    SqlModule,
    TypeOrmModule.forFeature([Apps, HistoryInfo, WechatOfficial]),
    HttpModule
  ],
  controllers: [DigitalHumanController, FacefusionController, ChatController, MimicmotionController, CosyvoiceController, WechatArticleExporterController],
  providers: [DigitalHumanService, AppListService, FacefusionService, ChatService, MimicmotionService, CosyvoiceService, WechatArticleExporterService, CookieManagerService],
  exports: []
})
export class AppToolsModule {}

import { Module } from '@nestjs/common';
import { ApiController } from './controller/api/api.controller';
import { UploadService } from './service/upload/upload.service';
import { IsimgService } from './service/isimg/isimg.service';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
import { MeituautoService } from './service/meituauto/meituauto.service';
import { ChatqwenService } from './service/chatqwen/chatqwen.service';
import { AlimsgService } from './service/alimsg/alimsg.service';
import { SqlModule } from '../sql/sql.module';
import { PayController } from './controller/pay/pay.controller';
import { PayService } from './service/pay/pay.service';
import { Pay } from 'src/entities/pay/pay.entity';
import { UserInfo } from 'src/entities/userinfo.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkInfo } from 'src/entities/workinfo.entity';
import { ParamsInfo } from 'src/entities/params.entity';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { UserPoints } from 'src/entities/userAssets/userPoints.entity';
import { UserMembership } from 'src/entities/userAssets/userMembership.entity';
import { UserPremiumFeature } from 'src/entities/userAssets/userPremiumFeature.entity';
import { AsrController } from './controller/asr/asr.controller';
import { AsrService } from './service/asr/asr.service';

@Module({
  imports: [
    SqlModule,
    TypeOrmModule.forFeature([
      Pay, 
      UserInfo, 
      WorkInfo, 
      ParamsInfo,
      UserAssets,
      UserPoints,
      UserMembership,
      UserPremiumFeature
    ])
  ],
  controllers: [ApiController, PayController, AsrController],
  providers: [UploadService, IsimgService, DatatransService, MeituautoService, ChatqwenService, AlimsgService, PayService, UserAssetsService, AsrService],
  exports: [UploadService, ChatqwenService, MeituautoService, AlimsgService],
})
export class ApiModule {}

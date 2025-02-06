import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { HistoryService } from './service/history/history.service';
import { HistoryController } from './controller/history/history.controller';
import { SqlService } from './service/sql/sql.service';
import { OssController } from './controller/oss/oss.controller';
import { OssService } from './service/oss/oss.service';
import { UserUpload } from '../../entities/userupload.entity';
import { ShopItems } from 'src/entities/shopItems.entity';
import { UserInfo } from 'src/entities/userinfo.entity';
import { Pay } from 'src/entities/pay/pay.entity';
import { Feedback } from 'src/entities/feedback.entity';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
import { JwtService } from '@nestjs/jwt';
import { AdminController } from './controller/admin/admin.controller';
import { AdminService } from './service/admin/admin.service';
import { BosController } from './controller/bos/bos.controller';
import { BosService } from './service/bos/bos.service';
import { ShopController } from './controller/shop/shop.controller';
import { UserAssetsService } from './service/user-assets/user-assets.service';
// 用户资产相关实体
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { UserMembership } from 'src/entities/userAssets/userMembership.entity';
import { UserPoints } from 'src/entities/userAssets/userPoints.entity';
import { UserPremiumFeature } from 'src/entities/userAssets/userPremiumFeature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HistoryInfo, UserUpload, UserInfo, Pay, Feedback, ShopItems, UserAssets, UserMembership, UserPoints, UserPremiumFeature])
  ],
  controllers: [HistoryController, OssController, AdminController, BosController, ShopController],
  providers: [HistoryService, SqlService, OssService, DatatransService, JwtService, AdminService, BosService, UserAssetsService],
  exports: [SqlService, HistoryService, OssService]
})
export class SqlModule {}

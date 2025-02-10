import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UploadController } from './controller/upload/upload.controller';
import { DownloadController } from './controller/download/download.controller';
import { UploadService } from './service/upload/upload.service';
import { SqlModule } from '../sql/sql.module';
import { ApiModule } from '../api/api.module';
import { DatatransService } from 'src/service/datatrans/datatrans.service';
import { UserMiddleware } from './middleware/user.middleware';
import { RegisterController } from './controller/register/register.controller';
import { LoginController } from './controller/login/login.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './others/jwtconstants';
import { JwtStrategy } from './others/jwt.strategy';
import { LocalStrategy } from './others/local.strategy';
import { ForgetpasswordMiddleware } from './middleware/forgetpassword.middleware';
import { SettingsController } from './controller/settings/settings.controller';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { UserPoints } from 'src/entities/userAssets/userPoints.entity';
import { UserMembership } from 'src/entities/userAssets/userMembership.entity';
import { UserPremiumFeature } from 'src/entities/userAssets/userPremiumFeature.entity';
import { UserInfo } from 'src/entities/userinfo.entity';

@Module({
  imports: [
    SqlModule,
    ApiModule,
    TypeOrmModule.forFeature([
      UserAssets,
      UserPoints,
      UserMembership,
      UserPremiumFeature,
      UserInfo
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UploadController, DownloadController, RegisterController, LoginController, SettingsController],
  providers: [UploadService, DatatransService, LocalStrategy, JwtStrategy, UserAssetsService],
  exports: []
})

//使用中间件截取请求
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UserMiddleware)
      .forRoutes('user/register/post'),
      consumer
        .apply(ForgetpasswordMiddleware)
        .forRoutes('user/register/forgetpassword')
  }
}

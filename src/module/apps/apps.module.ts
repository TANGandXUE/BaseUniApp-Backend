import { Module } from '@nestjs/common';
import { AppListController } from './controller/app-list/app-list.controller';
import { AppListService } from './service/app-list/app-list.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apps } from 'src/entities/apps.entity';
import { HistoryInfo } from 'src/entities/historyInfo.entity';
import { TaskRecordsService } from './service/task-records/task-records.service';
import { UploadManagerService } from './service/upload-manager/upload-manager.service';
import { UploadInfo } from 'src/entities/uploadInfo.entity';
import { UploadManagerController } from './controller/upload-manager/upload-manager.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Apps, HistoryInfo, UploadInfo])],
  controllers: [AppListController, UploadManagerController],
  providers: [AppListService, TaskRecordsService, UploadManagerService],
  exports: [TaskRecordsService, AppListService]
})
export class AppsModule { }
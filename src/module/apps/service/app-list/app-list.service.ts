import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Apps } from 'src/entities/apps.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppListService {

    constructor(
        // 注入相关数据库
        @InjectRepository(Apps)
        private readonly appsRepository: Repository<Apps>,
    ) { }


    // 新增应用
    async addApp(app: Apps) {
        app.AppCreateTime = new Date(); // 添加创建时间
        const result = await this.appsRepository.save(app);
        if (result['AppId'])
            return { isSuccess: true, message: '应用添加成功', data: result };
        else
            return { isSuccess: false, message: '连接应用数据库异常', data: {} };
    }

    // 修改应用
    async updateApp(app: Partial<Apps>) {
        if (!app.AppId) {
            return { isSuccess: false, message: '应用ID不能为空', data: {} };
        }
        const result = await this.appsRepository.update(app.AppId, app);
        if (result.affected > 0) {
            return { isSuccess: true, message: '应用修改成功', data: result };
        } else {
            return { isSuccess: false, message: '修改失败或应用不存在', data: {} };
        }
    }

    // 获取公开应用列表
    async getPublicAppList() {
        const result = await this.appsRepository.find({ where: { AppStatus: 1 } });
        return { isSuccess: true, message: '获取应用列表成功', data: result };
    }
}

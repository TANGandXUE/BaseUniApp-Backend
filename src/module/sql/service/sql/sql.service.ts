import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserUpload } from 'src/entities/userupload.entity';
import { UserInfo } from 'src/entities/userinfo.entity';
import { Pay } from 'src/entities/pay/pay.entity';
import { Feedback } from 'src/entities/feedback.entity';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from 'src/module/user/others/jwtconstants';
import * as dotenv from 'dotenv';
import { ShopItems } from 'src/entities/shopItems.entity';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';
import { UserAssets } from 'src/entities/userAssets/userAssets.entity';
import { DataSource } from 'typeorm';
dotenv.config();

const initUserAvatarUrl = process.env.INIT_USER_AVATAR_URL || 'https://clouddreamai.com/userLogo.jpg'
const minPointsAfterDeduct = Number(process.env.MIN_POINTS_AFTER_DEDUCT || '0');
const initUserPoints = Number(process.env.INIT_USER_POINTS || '100');
@Injectable()
export class SqlService {

    constructor(
        // 注入相关数据库
        @InjectRepository(UserUpload)
        private readonly userUploadRepository: Repository<UserUpload>,
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        @InjectRepository(Pay)
        private readonly payRepository: Repository<Pay>,
        @InjectRepository(Feedback)
        private readonly feedbackRepository: Repository<Feedback>,
        @InjectRepository(ShopItems)
        private readonly shopItemsRepository: Repository<ShopItems>,
        // 注入相关服务
        private jwtService: JwtService,
        private readonly userAssetsService: UserAssetsService,
        private readonly dataSource: DataSource
    ) { }

    uploadFiles(fileInfos: Array<{ fileName: string, filePath: string }>) {

        for (const fileInfo of fileInfos) {
            const userUpload = new UserUpload();
            userUpload.uploadDate = new Date();
            userUpload.fileName = fileInfo.fileName;
            userUpload.filePath = fileInfo.filePath;
            // userUpload.userId = userId 后期需要改成传入userID
            userUpload.userId = 0;
            this.userUploadRepository.save(userUpload);

            // const columns = getMetadataArgsStorage().columns.filter(c => c.target === UserUpload);

            // console.log("UserUpload中的Columns:");
            // columns.forEach(c => {
            //     console.log(c.propertyName);
            // });
        }
    }

    // 用户注册
    async register(
        registerInfos: {
            userName: string,
            userPassword: string,
            userPhone: string,
            userEmail: string,
        }
    ) {
        return this.dataSource.transaction(async manager => {
            try {
                // 1. 先创建用户基本信息
                const userCount = await manager.count(UserInfo);
                console.log("当前用户数量: ", userCount);

                const userInfo = new UserInfo();
                userInfo.userName = registerInfos.userName;
                userInfo.userPassword = registerInfos.userPassword;
                userInfo.userPhone = registerInfos.userPhone;
                userInfo.userEmail = registerInfos.userEmail;
                userInfo.userAvatarUrl = initUserAvatarUrl;
                userInfo.userRegisterDate = new Date();
                userInfo.userStatus = 'normal';
                userInfo.userUsedPoints = 0;
                userInfo.userIsAdmin = userCount === 0; // 如果是第一个用户，设置为管理员

                console.log("userInfo: ", userInfo);

                // 2. 保存用户信息
                const savedUser = await manager.save(UserInfo, userInfo);

                console.log("savedUser: ", savedUser);

                // 3. 创建并保存用户资产记录
                const assets = new UserAssets();
                assets.user = savedUser;
                const savedAssets = await manager.save(UserAssets, assets);

                console.log("savedAssets: ", savedAssets);

                // 4. 初始化积分
                const result = await this.userAssetsService.addPoints(savedUser.userId, initUserPoints, 10 * 365 * 86400 * 1000, manager);

                console.log("初始化积分成功: ", result);

                return { isRegister: true, message: '注册成功' };
            } catch (error) {
                console.error('注册失败：', error);
                throw new Error('注册失败：' + error.message);
            }
        });
    }

    // 查找用户信息是否存在
    async elementExist(fieldName: any, value: any) {
        // 根据提供的字段名和值查询用户信息
        return await this.userInfoRepository.findOne({ where: { [fieldName]: value } });
    }

    // 更新用户信息
    async updateUserInfo(userPhone: string, userEmail: string, updateInfo: string, updateType: string) {

        let userToUpdate: any = {};

        // userPhone: 18001633139

        if (userPhone !== '')
            userToUpdate = await this.userInfoRepository.findOne({ where: { userPhone } });
        else if (userEmail !== '')
            userToUpdate = await this.userInfoRepository.findOne({ where: { userEmail } });
        else
            return { isSuccess: false, message: '手机号和邮箱均为空' };

        // 检查用户是否存在
        if (!userToUpdate) {
            console.log("用户不存在");
            return { isSuccess: false, message: '用户不存在' };
        }

        // 判断更新的信息是否是不能与数据库中数据重复的类型，比如手机号不能重复等
        if (updateType === "userName") {
            if (await this.elementExist(updateType, updateInfo))
                return { isSuccess: false, message: '用户名已存在' };
        } else if (updateType === "userPhone") {
            if (await this.elementExist(updateType, updateInfo))
                return { isSuccess: false, message: '手机号已存在' };
        } else if (updateType === "userEmail") {
            if (await this.elementExist(updateType, updateInfo))
                return { isSuccess: false, message: '邮箱已存在' };
        }

        // 更新信息
        userToUpdate[updateType] = updateInfo;

        // 保存更新后的用户信息到数据库
        await this.userInfoRepository.save(userToUpdate);
        console.log("用户信息更新成功: ", userToUpdate);
        return { isSuccess: true, message: '用户信息更新成功' };
    }

    // 获取点数
    async getPoints(userPhone: string, userEmail: string) {
        let userToGet: any = {};

        if (userPhone !== '')
            userToGet = await this.userInfoRepository.findOne({ where: { userPhone } });
        else if (userEmail !== '')
            userToGet = await this.userInfoRepository.findOne({ where: { userEmail } });
        else
            return { isSuccess: false, message: '手机号和邮箱均为空' };

        // 检查用户是否存在
        if (!userToGet) {
            console.log("用户不存在");
            return { isSuccess: false, message: '用户不存在' };
        } else {
            return { isSuccess: true, message: '获取点数成功', data: userToGet.userPoints };
        }
    }

    // 获取所有用户信息
    async getUserInfos(userId: number) {
        let basicInfos = await this.userInfoRepository.findOne({ where: { userId } });

        // 获取用户资产
        const userPoints = await this.userAssetsService.getAvailablePoints(userId);
        const userLevel = await this.userAssetsService.getCurrentMembershipLevel(userId);

        // console.log("userLevel: ", userLevel);
        // console.log("userPoints: ", userPoints);

        // 将用户资产和用户等级合并到基本信息中
        let userInfos = {
            ...basicInfos,
            userPoints,
            userLevel
        }

        // 检查用户是否存在
        if (!basicInfos) {
            console.log("用户不存在");
            return { isSuccess: false, message: '用户不存在' };
        } else {
            return { isSuccess: true, message: '获取用户信息成功', data: userInfos };
        }
    }

    // 判断点数够不够
    async isPointsEnough(userPhone: string, userEmail: string, pointsToDeduct: number) {
        let userToGet: any = {};

        if (userPhone !== '')
            userToGet = await this.userInfoRepository.findOne({ where: { userPhone } });
        else if (userEmail !== '')
            userToGet = await this.userInfoRepository.findOne({ where: { userEmail } });
        else
            return { isSuccess: false, message: '手机号和邮箱均为空' };

        // 检查用户是否存在
        if (!userToGet) {
            console.log("用户不存在");
            return { isSuccess: false, message: '用户不存在' };
        }

        if (userToGet.userPoints - pointsToDeduct < minPointsAfterDeduct)
            return { isSuccess: false, message: '点数不足', data: userToGet.userPoints }
        else
            return { isSuccess: true, message: '点数充足', data: userToGet.userPoints };

    }


    // 判断点数够不够(通过用户ID)
    async isPointsEnoughByUserId(userId: number, deductPoints: number) {
        // console.log('userId: ', userId);
        let userToGet = await this.userInfoRepository.findOne({ where: { userId } });
        let userPoints = await this.userAssetsService.getAvailablePoints(userId);

        // 检查用户是否存在
        if (!userToGet) {
            console.log("用户不存在");
            return { isSuccess: false, message: '用户不存在' };
        }


        // console.log("扣除点数: ", deductPoints);
        // console.log('userToGet.userPoints: ', userToGet.userPoints);
        // console.log('剩余点数: ', userToGet.userPoints - deductPoints);
        // console.log('最低点数: ', minPointsAfterDeduct);
        // console.log('计算结果: ', (userToGet.userPoints - deductPoints) < minPointsAfterDeduct);

        if (userPoints - deductPoints < minPointsAfterDeduct)
            return { isSuccess: false, message: '点数不足', data: userPoints }
        else {
            return { isSuccess: true, message: '点数充足', data: userPoints };
        }

    }

    // 扣除点数
    async deductPoints(userId: number, pointsToDeduct: number) {
        // 扣除点数
        const result = await this.userAssetsService.consumePoints(userId, pointsToDeduct);
        // console.log("扣点成功: ", userToUpdate);
        return { isSuccess: true, message: '扣点成功', data: result };
    }

    // 包含检测用户是否点数足够的扣除点数
    async deductPointsWithCheck(user: {
        userId: number;
    }, pointsToDeduct: number) {
        try {
            const isPointsEnough = await this.isPointsEnoughByUserId(user.userId, pointsToDeduct);
            if (isPointsEnough.isSuccess) {
                try {
                    return await this.deductPoints(user.userId, pointsToDeduct);
                } catch (error) {
                    console.error('扣除点数失败: ', error);
                    return { isSuccess: false, message: '扣除点数失败' };
                }
            } else {
                return { isSuccess: false, message: '点数不足，扣除失败' };
            }
        } catch (error) {
            console.error('扣除点数失败: ', error);
            return { isSuccess: false, message: '扣除点数失败' };
        }
    }

    // 用户登录
    async validateUser(loginInfos: { userNameOrPhoneOrEmail: string, userPassword: string }): Promise<any> {
        // 正则表达式用于匹配邮箱和手机号
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^1[3-9]\d{9}$/;

        let identifierType: string;
        let user: UserInfo | null = null;

        // console.log(typeof(loginInfos.userNameOrPhoneOrEmail));

        // console.log('这里执行到了');

        if (emailPattern.test(loginInfos.userNameOrPhoneOrEmail)) {
            identifierType = 'userEmail';
        } else if (phonePattern.test(loginInfos.userNameOrPhoneOrEmail)) {
            identifierType = 'userPhone';
        } else {
            // 假设剩下的情况是用户名
            identifierType = 'userName';
        }

        // 查询用户
        user = await this.elementExist(identifierType, loginInfos.userNameOrPhoneOrEmail);

        // console.log("user: ", user);

        // 处理查询结果
        if (user) {
            // 验证密码
            if (user.userPassword === loginInfos.userPassword) {
                console.log("登录成功，欢迎回来，", user.userName);
                return user;
            } else {
                // console.log("密码错误，请重新输入");
                return '密码错误，请重新输入';
            }
        } else {
            // 根据输入类型给出对应的提示
            switch (identifierType) {
                case 'userName':
                    // console.log("用户名不存在，请检查输入");
                    return '用户名不存在，请检查输入';
                case 'userPhone':
                    // console.log("手机号未注册，请先注册");
                    return '手机号未注册，请先注册';
                case 'userEmail':
                    // console.log("邮箱未注册，请先注册");
                    return '邮箱未注册，请先注册';
                default:
                    // console.log("输入不合法，请输入用户名、手机号或邮箱");
                    return '输入不合法，请输入用户名、手机号或邮箱'
            }
        }
    }

    async login(user: any) {
        // 最初userId命名为sub是为了与JWT标准保持一致
        // 后面觉得很乱，就改了
        // 这个payload将access_token与用户的各类信息相关联，从而让用户在提供access_token后能够访问这些信息
        const payload = {
            userName: user.userName,
            userId: user.userId,
            userPassword: user.userPassword,
            userPoints: user.userPoints,
            userPhone: user.userPhone,
            userEmail: user.userEmail,
            userStatus: user.userStatus,
            userLevel: user.userLevel,
            userExpireDate: user.userExpireDate,
            userUsedPoints: user.userUsedPoints,
            userRegisterDate: user.userRegisterDate,
            userAvatarUrl: user.userAvatarUrl,
            userIsAdmin: user.userIsAdmin
        };

        // 下面这行这是官方文档的写法，但被证明是错误的了，所以更新了写法
        // console.log("access_token: ", this.jwtService.sign(payload));   
        return {
            access_token: this.jwtService.sign(
                payload,
                { secret: jwtConstants.secret }
            )
        };
    }

    // 发送反馈到数据库
    async sendFeedback(
        userId: number,
        userName: string,
        userPhone: string,
        userEmail: string,
        feedbackText: string
    ) {
        const feedback = new Feedback();
        feedback.FeedbackUserId = userId;
        feedback.FeedbackUserName = userName;
        feedback.FeedbackUserPhone = userPhone;
        feedback.FeedbackUserEmail = userEmail;
        feedback.FeedbackText = feedbackText;
        const result = await this.feedbackRepository.save(feedback);
        if (result['FeedbackId'])
            return { isSuccess: true, message: '反馈成功', data: result };
        else
            return { isSuccess: false, message: '连接反馈数据库异常', data: {} };
    }

    // 添加商品
    async addShopItem(shopItem: ShopItems) {

        const result = await this.shopItemsRepository.save(shopItem);
        if (result['shopItemId'])
            return { isSuccess: true, message: '商品添加成功', data: result };
        else
            return { isSuccess: false, message: '连接商品数据库异常', data: {} };
    }

    // 获取单个商品信息
    async getSingleShopItem(shopItemId: number) {
        const result = await this.shopItemsRepository.findOneBy({ shopItemId });
        if (result)
            return { isSuccess: true, message: '商品获取成功', data: result };
        else
            return { isSuccess: false, message: '商品获取失败', data: {} };
    }
    // 获取所有商品信息
    async getShopItems() {
        const result = await this.shopItemsRepository.find();
        if (result.length > 0)
            return { isSuccess: true, message: '所有商品获取成功', data: result };
        else
            return { isSuccess: false, message: '所有商品获取失败', data: {} };
    }

    // 更新商品信息（整合数据处理逻辑）
    async updateShopItem(shopItemId: number, updateData: Partial<ShopItems>) {
        // 1. 过滤非法字段
        const { shopItemId: _, shopItemCreateTime: __, ...filteredData } = updateData;

        // 2. 添加系统维护字段
        const finalData = {
            ...filteredData,
            shopItemUpdateTime: new Date()
        };

        // 3. 执行更新操作
        const result = await this.shopItemsRepository.update(shopItemId, finalData);

        // 4. 返回更新结果
        if (result.affected && result.affected > 0) {
            return {
                isSuccess: true,
                message: '商品更新成功',
                data: await this.shopItemsRepository.findOneBy({ shopItemId })
            };
        }
        return { isSuccess: false, message: '商品更新失败', data: {} };
    }

    // 删除商品
    async deleteShopItem(shopItemId: number) {
        // 添加参数验证
        if (!Number.isInteger(shopItemId) || shopItemId <= 0) {
            return { isSuccess: false, message: '无效的商品ID', data: {} };
        }

        // 使用更安全的删除方式
        const result = await this.shopItemsRepository.delete({ shopItemId });

        // 使用更标准的affected判断方式
        if (result.affected && result.affected > 0)
            return { isSuccess: true, message: '商品删除成功', data: result };
        else
            return { isSuccess: false, message: '商品删除失败', data: {} };
    }


}


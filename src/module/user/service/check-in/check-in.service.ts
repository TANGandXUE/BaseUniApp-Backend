import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SignIn } from 'src/entities/signIn.entity';
import { UserInfo } from 'src/entities/userinfo.entity';
import { UserAssetsService } from 'src/module/sql/service/user-assets/user-assets.service';

@Injectable()
export class CheckInService {
    constructor(
        @InjectRepository(SignIn)
        private readonly signInRepository: Repository<SignIn>,
        @InjectRepository(UserInfo)
        private readonly userInfoRepository: Repository<UserInfo>,
        private readonly userAssetsService: UserAssetsService,
    ) { }

    // 执行签到
    async performSignIn(userId: number) {
        // 检查用户是否存在
        const user = await this.userInfoRepository.findOne({ where: { userId } });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        // 检查今日是否已签到
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingSignIn = await this.signInRepository.findOne({
            where: {
                user: { userId },
                signInDate: today
            }
        });

        if (existingSignIn) {
            throw new BadRequestException('今日已经签到过了');
        }

        // 创建签到记录
        const signIn = this.signInRepository.create({
            user,
            pointsEarned: 100,
            signInDate: today
        });

        // 添加积分（一个月有效期）
        const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
        await this.userAssetsService.addPoints(userId, 100, oneMonthMs);

        // 保存签到记录
        return await this.signInRepository.save(signIn);
    }

    // 查询签到记录
    async getSignInHistory(userId: number, startDate: Date, endDate: Date) {
        // 检查用户是否存在
        const user = await this.userInfoRepository.findOne({ where: { userId } });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        // 查询指定日期范围内的签到记录
        return await this.signInRepository.find({
            where: {
                user: { userId },
                signInDate: Between(startDate, endDate)
            },
            order: {
                signInDate: 'DESC'
            }
        });
    }

    // 获取用户签到统计信息
    async getSignInStats(userId: number) {
        // 检查用户是否存在
        const user = await this.userInfoRepository.findOne({ where: { userId } });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        // 获取总签到次数
        const totalSignIns = await this.signInRepository.count({
            where: { user: { userId } }
        });

        // 获取本月签到次数
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const monthlySignIns = await this.signInRepository.count({
            where: {
                user: { userId },
                signInDate: Between(firstDayOfMonth, lastDayOfMonth)
            }
        });

        // 获取连续签到天数
        const consecutiveDays = await this.getConsecutiveSignInDays(userId);

        return {
            totalSignIns,
            monthlySignIns,
            consecutiveDays
        };
    }

    // 获取连续签到天数
    private async getConsecutiveSignInDays(userId: number): Promise<number> {
        let consecutiveDays = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        while (true) {
            const signIn = await this.signInRepository.findOne({
                where: {
                    user: { userId },
                    signInDate: currentDate
                }
            });

            if (!signIn) {
                break;
            }

            consecutiveDays++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return consecutiveDays;
    }
}
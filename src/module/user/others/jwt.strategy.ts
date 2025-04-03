import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwtconstants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    // 当使用JWT访问时，返回所有用户信息。
    async validate(payload: any) {
        return {
            userName: payload.userName,
            userId: payload.userId,
            userPassword: payload.userPassword,
            userPhone: payload.userPhone,
            userEmail: payload.userEmail,
            userStatus: payload.userStatus,
            userUsedPoints: payload.userUsedPoints,
            userRegisterDate: payload.userRegisterDate,
            userAvatarUrl: payload.userAvatarUrl,
            userIsAdmin: payload.userIsAdmin,
            userInviteCode: payload.userInviteCode || '',
            userBeInvitedUserId: payload.userBeInvitedUserId || null,
            userIsAgent: payload.userIsAgent || false,
            userAgentRate: payload.userAgentRate || 0
        };
    }
}
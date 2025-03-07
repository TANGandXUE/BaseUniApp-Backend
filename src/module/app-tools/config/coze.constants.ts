import * as fs from 'fs';
import * as path from 'path';
import { COZE_CN_BASE_URL } from '@coze/api';

export const COZE_CONSTANTS = {
    APP_ID: process.env.COZE_APP_ID || '1165770023978',
    PUBLIC_KEY: process.env.COZE_PUBLIC_KEY || 'iZWVkcUwRO-un-hi_yMHMFusDwdKsobLnVRCtJ4qcJg',
    PRIVATE_KEY: fs.readFileSync(path.join(process.cwd(), 'private_key.pem'), 'utf8'),
    API_ENDPOINT: 'api.coze.cn',
    TOKEN_URL: 'https://api.coze.cn/api/permission/oauth2/token',
    JWT_EXPIRES_IN: 60, // 1分钟
    ACCESS_TOKEN_DURATION: 60 // 1分钟
};

export const DEFAULT_COZE_BOT_ID = process.env.COZE_DEFAULT_BOT_ID || 'bot_00000000000000000000000000000000';

export {
    COZE_CN_BASE_URL
}; 
import * as fs from 'fs';
import * as path from 'path';
import { COZE_CN_BASE_URL, COZE_COM_BASE_URL } from '@coze/api';

export const COZE_CONSTANTS_CN = {
    APP_ID: process.env.COZE_APP_ID_CN || '1165770023978',
    PUBLIC_KEY: process.env.COZE_PUBLIC_KEY_CN || 'iZWVkcUwRO-un-hi_yMHMFusDwdKsobLnVRCtJ4qcJg',
    PRIVATE_KEY: fs.readFileSync(path.join(process.cwd(), 'private_key_cn.pem'), 'utf8'),
    API_ENDPOINT: 'api.coze.cn',
    TOKEN_URL: 'https://api.coze.cn/api/permission/oauth2/token',
    JWT_EXPIRES_IN: 600, // 10分钟
    ACCESS_TOKEN_DURATION: 600 // 10分钟
};

export const COZE_CONSTANTS_COM = {
    APP_ID: process.env.COZE_APP_ID_COM || '1137739075990',
    PUBLIC_KEY: process.env.COZE_PUBLIC_KEY_COM || '38uu8c-UZ6h1uOoD4znGqHLhpDGe16pGC0tT80Eb6lY',
    PRIVATE_KEY: fs.readFileSync(path.join(process.cwd(), 'private_key_com.pem'), 'utf8'),
    API_ENDPOINT: 'api.coze.com',
    TOKEN_URL: 'https://api.coze.com/api/permission/oauth2/token',
    JWT_EXPIRES_IN: 600, // 10分钟
    ACCESS_TOKEN_DURATION: 600 // 10分钟
};

export const DEFAULT_COZE_BOT_ID_CN = process.env.COZE_DEFAULT_BOT_ID_CN || 'bot_00000000000000000000000000000000';
export const DEFAULT_COZE_BOT_ID_COM = process.env.COZE_DEFAULT_BOT_ID_COM || 'bot_00000000000000000000000000000000';

export {
    COZE_CN_BASE_URL,
    COZE_COM_BASE_URL
}; 
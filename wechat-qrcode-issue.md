# 微信公众号二维码获取问题

## 问题描述
在通过后端服务获取微信公众号登录二维码时，遇到了请求被拒绝的情况。虽然会话创建成功，但获取二维码时失败。

## 当前环境
- 后端服务：NestJS
- HTTP 客户端：@nestjs/axios
- 目标服务：微信公众号导出服务 (http://localhost:3000)

## 请求流程

### 1. 创建会话（成功）
```http
POST http://localhost:3000/api/login/session/{sessionId}

Headers:
Content-Type: application/json
Referer: https://mp.weixin.qq.com/

Response:
{
    "base_resp": {
        "err_msg": "ok",
        "ret": 0
    }
}
```

### 2. 获取二维码（失败）
```http
GET http://localhost:3000/api/login/getqrcode?rnd={random}

Headers:
Accept: */*
Host: localhost:3000
Connection: keep-alive
User-Agent: Apifox/1.0.0 (https://apifox.com)

Response Headers:
connection: keep-alive
content-length: 0
logicret: 1
retkey: 11
strict-transport-security: max-age=15552000
date: Tue, 11 Feb 2025 04:00:08 GMT
```

## 对比测试

### Apifox 直接请求（成功）
```http
GET http://localhost:3000/api/login/getqrcode?rnd=0.123

Headers:
User-Agent: Apifox/1.0.0 (https://apifox.com)
Accept: */*
Host: localhost:3000
Connection: keep-alive

Response Headers:
accept-ranges: bytes
cache-control: max-age=604800
content-length: 5775
content-type: image/jpg
date: Tue, 11 Feb 2025 03:57:54 GMT
expires: Tue, 18 Feb 2025 11:57:47 +0800
logicret: 0
retkey: 14
```

## 关键差异
1. 成功请求时：
   - logicret: 0
   - content-type: image/jpg
   - content-length: 5775

2. 失败请求时：
   - logicret: 1
   - content-length: 0
   - 无 content-type

## 已尝试的解决方案
1. 模拟 Apifox 的请求头
2. 添加会话相关的 Cookie
3. 调整请求配置（timeout, maxRedirects 等）

## 问题分析
1. 虽然使用完全相同的请求头，但服务端似乎仍然能够识别出这是一个后端服务的请求
2. logicret=1 和 retkey=11 可能表示某种认证或权限问题
3. 可能需要特定的会话状态或认证信息

## 需要确认的问题
1. logicret 和 retkey 这两个响应头的具体含义是什么？
2. 服务端是如何区分和验证请求来源的？
3. 是否需要特定的认证流程或会话状态？
4. 是否有其他必需的请求头或参数？

## 补充信息
如果您需要查看完整的代码实现或其他信息，请告诉我。 
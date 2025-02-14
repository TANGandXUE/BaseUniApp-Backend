# 微信开放平台授权对接问题答复

## 1. 回调地址配置

### 回调地址说明
- 回调地址（redirect_uri）是在获取授权链接时动态传入的
- 不需要在微信开放平台预先配置
- 回调地址必须使用 https 协议

### 回调地址处理方式
- 回调地址由前端处理
- 前端需要创建一个专门的回调页面（pages/wechat-auth/callback）
- 回调地址示例：https://your-domain.com/pages/wechat-auth/callback

### 具体回调地址
- 生产环境：https://your-domain.com/pages/wechat-auth/callback
- 测试环境：https://test.your-domain.com/pages/wechat-auth/callback

注意：虽然回调地址不需要预先配置，但域名必须有 ICP 备案，且必须使用 https 协议。

## 2. 授权流程确认

### 获取授权链接
- 是的，需要传入回调地址
- redirectUri 参数必填，且必须是完整的 URL（包含协议头）
- 建议在前端将回调地址进行 encodeURIComponent 处理

### 授权回调流程
1. 用户扫码授权后，微信会跳转到您提供的 redirectUri
2. 回调地址会带上 auth_code 和 expires_in 参数
3. 前端需要在回调页面获取这些参数并调用后端接口处理

### 授权状态获取
- 不需要轮询，授权是即时的
- 在回调页面调用 callback 接口后即可获知授权结果
- 新增了 status 接口用于查询当前授权状态

## 3. 接口确认与补充

### 已有接口
- GET /user/wechat-open-platform/authorizer/url
  * 参数：redirectUri, authType(可选)
  * 返回：{ url: string }

- GET /user/wechat-open-platform/authorizer/callback
  * 参数：auth_code, expires_in
  * 返回：授权信息对象

### 新增接口
- GET /user/wechat-open-platform/authorizer/status
  * 参数：authorizerAppid
  * 返回：{ status: 'authorized' | 'unauthorized', authInfo?: object }

## 4. 数据结构确认

### 授权信息结构
返回数据结构如下：
{
  authorizerAppid: string;
  authorizerInfo: {
    nickName: string;
    headImg: string;
    serviceTypeInfo: { id: number };
    verifyTypeInfo: { id: number };
    userName: string;
    principalName: string;
    businessInfo: object;
    qrcodeUrl: string;
    signature: string;
  };
  funcInfo: Array<{ funcscope_category: { id: number } }>;
}

### Token 存储
- 不需要在前端存储 token
- 后端会维护 token 的存储和刷新
- 前端只需要存储 authorizerAppid 即可

## 5. 安全性考虑

### 前端安全参数
- 不需要额外的安全参数
- 所有敏感操作都在后端处理

### 授权链接安全性
- 授权链接由后端生成，包含了必要的安全参数
- 链接有效期为 5 分钟
- 一个预授权码只能使用一次

## 6. 其他问题说明

### 授权有效期
- 授权本身永久有效，直到被取消
- access_token 有效期为 2 小时，由后端自动刷新
- refresh_token 有效期为 30 天，也由后端自动处理

### 刷新机制
- 后端自动处理 token 的刷新
- 前端无需关心刷新逻辑

### 解除授权
- 已添加解除授权接口：POST /user/wechat-open-platform/authorizer/unbind
- 参数：authorizerAppid
- 建议添加二次确认机制

### 异常处理
后端异常响应格式：
{
  code: number;
  message: string;
  details?: any;
}

常见错误码：
- 40001: 无效的授权码
- 40002: 授权已过期
- 40003: 未找到授权信息
- 40004: 授权处理失败

前端需要针对不同错误码显示相应的错误提示，并在必要时引导用户重新授权。

## 补充说明

1. 开发环境配置
   - 建议使用测试号进行开发
   - 测试环境已配置好对应的域名

2. 调试工具
   - 推荐使用微信开发者工具调试
   - 后端提供了日志查看接口

3. 注意事项
   - 授权链接仅能在微信内或微信开发者工具中打开
   - 回调地址必须是已配置的域名
   - 建议在正式环境部署前完成完整的测试流程 
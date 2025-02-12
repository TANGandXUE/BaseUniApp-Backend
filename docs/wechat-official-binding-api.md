# 微信公众号绑定接口文档

## 接口说明
本文档描述了微信公众号绑定相关的接口。所有接口都需要在请求头中携带 JWT token。

## 基础配置
请求基础配置示例：
```typescript
const request = (options: UniApp.RequestOptions) => {
  const token = uni.getStorageSync('token');
  const baseUrl = 'YOUR_BASE_URL';  // 替换为实际的后端地址
  
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      url: baseUrl + options.url,
      header: {
        ...options.header,
        'Authorization': `Bearer ${token}`
      },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    });
  });
};
```

## 接口列表

### 1. 开始绑定流程
- 请求方式：POST
- 接口路径：/user/bind-accounts/wechat-official/start
- 请求参数：无
- 响应数据：
  ```typescript
  interface StartBindingResponse {
    isSuccess: boolean;
    message: string;
    data: {
      sessionId: string;  // 会话ID
      qrcode: string;  // base64格式的二维码图片数据
      expireTime: string;  // ISO 8601格式的过期时间
    } | null;
  }
  ```
- 使用示例：
  ```typescript
  const startBinding = async () => {
    try {
      const result = await request({
        url: '/user/bind-accounts/wechat-official/start',
        method: 'POST'
      });
      
      if (result.isSuccess) {
        // 显示二维码
        const qrcodeBase64 = result.data.qrcode;
        // 开始轮询检查状态
        startPolling();
      } else {
        uni.showToast({ title: result.message, icon: 'none' });
      }
    } catch (error) {
      uni.showToast({ title: '启动绑定流程失败', icon: 'none' });
    }
  };
  ```

### 2. 检查绑定状态
- 请求方式：POST
- 接口路径：/user/bind-accounts/wechat-official/check
- 请求参数：无
- 响应数据：
  ```typescript
  interface CheckBindingResponse {
    isSuccess: boolean;
    message: string;
    data: {
      status: 'waiting' | 'scanned' | 'authorizing' | 'bound' | 'expired' | 'failed';
      nickname?: string;  // 仅在 status 为 bound 时返回
      avatar?: string;    // 仅在 status 为 bound 时返回
      errorMessage?: string;  // 仅在 status 为 failed 时返回
      remainingTime?: number;  // 剩余有效期（毫秒），仅在 status 为 waiting/scanned/authorizing 时返回
    };
  }
  ```
- 使用示例：
  ```typescript
  const checkBindingStatus = async () => {
    try {
      const result = await request({
        url: '/user/bind-accounts/wechat-official/check',
        method: 'POST'
      });
      
      switch (result.data.status) {
        case 'bound':
          stopPolling();
          uni.showToast({ title: '绑定成功', icon: 'success' });
          break;
        case 'expired':
          stopPolling();
          uni.showToast({ title: '二维码已过期，请重新获取', icon: 'none' });
          break;
        case 'failed':
          stopPolling();
          uni.showToast({ title: result.message, icon: 'none' });
          break;
        case 'waiting':
          // 继续等待
          break;
      }
    } catch (error) {
      uni.showToast({ title: '检查绑定状态失败', icon: 'none' });
    }
  };
  ```

### 3. 解除绑定
- 请求方式：POST
- 接口路径：/user/bind-accounts/wechat-official/unbind
- 请求参数：无
- 响应数据：
  ```typescript
  interface UnbindResponse {
    isSuccess: boolean;
    message: string;
    data: null;
  }
  ```
- 使用示例：
  ```typescript
  const unbind = async () => {
    try {
      const result = await request({
        url: '/user/bind-accounts/wechat-official/unbind',
        method: 'POST'
      });
      
      if (result.isSuccess) {
        uni.showToast({ title: '解除绑定成功', icon: 'success' });
      } else {
        uni.showToast({ title: result.message, icon: 'none' });
      }
    } catch (error) {
      uni.showToast({ title: '解除绑定失败', icon: 'none' });
    }
  };
  ```

### 4. 检查绑定有效性
- 请求方式：GET
- 接口路径：/user/bind-accounts/wechat-official/check-valid
- 请求参数：无
- 响应数据：
  ```typescript
  interface CheckValidResponse {
    isSuccess: boolean;
    message: string;
    data: {
      isBound: boolean;
      accountInfo?: {
        nickname: string;
        avatar: string;
        expireTime: string;
      };
    };
  }
  ```
- 使用示例：
  ```typescript
  const checkBindingValid = async () => {
    try {
      const result = await request({
        url: '/user/bind-accounts/wechat-official/check-valid',
        method: 'GET'
      });
      
      if (result.isSuccess) {
        if (result.data.isBound) {
          // 显示账号信息
          const accountInfo = result.data.accountInfo;
        } else {
          // 未绑定或已过期
        }
      }
    } catch (error) {
      uni.showToast({ title: '检查绑定状态失败', icon: 'none' });
    }
  };
  ```

## 完整的绑定流程示例

```typescript
const POLLING_INTERVAL = 2000;  // 轮询间隔：2秒
const MAX_POLLING_TIME = 300000;  // 最大轮询时间：5分钟

export default defineComponent({
  setup() {
    const pollingTimer = ref<number | null>(null);
    const startTime = ref<number>(0);
    
    // 开始轮询
    const startPolling = () => {
      startTime.value = Date.now();
      pollingTimer.value = setInterval(async () => {
        // 检查是否超时
        if (Date.now() - startTime.value >= MAX_POLLING_TIME) {
          stopPolling();
          uni.showToast({ title: '绑定超时，请重试', icon: 'none' });
          return;
        }
        
        // 检查绑定状态
        await checkBindingStatus();
      }, POLLING_INTERVAL);
    };
    
    // 停止轮询
    const stopPolling = () => {
      if (pollingTimer.value) {
        clearInterval(pollingTimer.value);
        pollingTimer.value = null;
      }
    };
    
    // 开始绑定流程
    const startBinding = async () => {
      try {
        const result = await request({
          url: '/user/bind-accounts/wechat-official/start',
          method: 'POST'
        });
        
        if (result.isSuccess) {
          // 显示二维码
          const qrcodeBase64 = result.data.qrcode;
          // 开始轮询
          startPolling();
        } else {
          uni.showToast({ title: result.message, icon: 'none' });
        }
      } catch (error) {
        uni.showToast({ title: '启动绑定流程失败', icon: 'none' });
      }
    };
    
    onUnmounted(() => {
      stopPolling();
    });
    
    return {
      startBinding
    };
  }
});
```

## 注意事项

1. 所有接口都需要在请求头中携带 JWT token
2. 会话有效期为30分钟，超时需要重新开始绑定流程
3. 轮询间隔建议设置为2秒，可根据实际情况调整
4. 建议在组件卸载时停止轮询
5. 接口返回的所有时间都是 ISO 8601 格式的字符串
6. remainingTime 字段表示会话的剩余有效期，单位为毫秒
7. 当收到 expired 或 failed 状态时，需要重新开始绑定流程

## 状态说明

绑定流程中的状态变化：

1. binding: 初始状态
   - 绑定流程刚开始
   - 等待用户扫描二维码
   - 返回剩余有效期

2. scanned: 用户已扫描二维码
   - 用户已使用微信扫描二维码并选择了公众号
   - 返回剩余有效期
   - 等待用户确认授权

3. authorizing: 等待用户授权
   - 用户已确认要绑定的公众号
   - 返回剩余有效期
   - 系统尝试完成最终登录（最多3次重试）

4. bound: 绑定成功
   - 用户已完成授权且最终登录成功
   - 返回用户昵称和头像
   - 绑定流程结束

5. expired: 会话已过期
   - 二维码或会话超过有效期（30分钟）
   - 或者最终登录时会话已失效
   - 需要重新开始绑定流程

6. failed: 绑定失败
   - 可能的原因：
     * 没有可用的公众号账号
     * QQ号需要绑定邮箱
     * 二维码加载失败
     * 其他系统错误
   - 返回具体的错误信息
   - 需要重新开始绑定流程

7. unbind: 未绑定状态
   - 初始状态或解绑后的状态
   - 可以开始新的绑定流程

## 最佳实践

1. 轮询策略
   - 初始间隔：1.5秒
   - 最大轮询时间：5分钟
   - 遇到错误时使用指数退避重试（1s, 2s, 4s）

2. 错误处理
   - 网络错误：最多重试3次
   - 会话过期：提示用户重新开始绑定流程
   - 授权失败：显示具体的错误信息
   - 绑定超时：自动停止轮询并提示用户

3. 状态管理
   - 记录开始时间用于超时判断
   - 保存会话ID用于状态查询
   - 在组件卸载时清理轮询定时器

4. 用户体验
   - 显示二维码的剩余有效期
   - 提供清晰的状态提示
   - 失败时给出具体原因
   - 提供重试选项

## 注意事项

1. 所有接口都需要在请求头中携带 JWT token
2. 会话有效期为30分钟，超时需要重新开始绑定流程
3. 轮询间隔建议为1.5秒，可根据实际情况调整
4. 建议在组件卸载时停止轮询
5. 接口返回的所有时间都是 ISO 8601 格式的字符串
6. remainingTime 字段表示会话的剩余有效期，单位为毫秒
7. 当收到 expired 或 failed 状态时，需要重新开始绑定流程
8. 同一IP的请求频率限制为600次/小时
9. bizLogin 接口在状态为 authorizing 时会自动重试3次 
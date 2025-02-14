# 微信开放平台授权指南

## 授权流程

1. 获取授权链接
2. 在web-view中打开授权链接
3. 用户扫码授权
4. 接收回调，处理授权信息
5. 获取授权令牌

## 接口说明

### 1. 获取授权链接
- 请求方式：GET
- 接口路径：/user/wechat-open-platform/authorizer/url
- 请求参数：
  - redirectUri: string (必填) - 授权成功后的回调地址
  - authType: number (可选) - 授权类型，默认为3
    - 1: 仅展示公众号
    - 2: 仅展示小程序
    - 3: 公众号和小程序都展示
- 返回数据：
  - url: string - 授权链接

### 2. 处理授权回调
- 请求方式：GET
- 接口路径：/user/wechat-open-platform/authorizer/callback
- 请求参数：
  - auth_code: string - 授权码
  - expires_in: number - 过期时间
- 返回数据：授权信息对象

### 3. 获取授权令牌
- 请求方式：GET
- 接口路径：/user/wechat-open-platform/authorizer/token
- 请求参数：
  - authorizerAppid: string - 授权方的appid
- 返回数据：授权令牌信息对象

## 前端实现示例

### 页面结构
1. 创建授权页面 pages/wechat-auth/index.vue
2. 创建回调页面 pages/wechat-auth/callback.vue

### 授权页面代码示例
pages/wechat-auth/index.vue:

<template>
  <view class="container">
    <web-view v-if="authUrl" :src="authUrl"></web-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'

const authUrl = ref('')

onMounted(async () => {
  // 注意：回调地址需要在微信开放平台配置域名白名单
  const callbackUrl = 'https://your-domain.com/pages/wechat-auth/callback'
  
  const res = await request({
    url: '/user/wechat-open-platform/authorizer/url',
    method: 'GET',
    data: {
      redirectUri: callbackUrl,
      authType: 3
    }
  })
  
  authUrl.value = res.data.url
})
</script>

### 回调页面代码示例
pages/wechat-auth/callback.vue:

<template>
  <view class="container">
    <text>授权处理中...</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { request } from '@/utils/request'
import { onLoad } from '@dcloudio/uni-app'

onLoad(async (options) => {
  const { auth_code, expires_in } = options
  
  if (auth_code) {
    try {
      // 处理授权回调
      const authInfo = await request({
        url: '/user/wechat-open-platform/authorizer/callback',
        method: 'GET',
        data: { auth_code, expires_in }
      })
      
      // 保存授权信息
      uni.setStorageSync('authInfo', authInfo.data)
      
      // 跳转到成功页面
      uni.redirectTo({
        url: '/pages/wechat-auth/success'
      })
    } catch (error) {
      console.error('授权处理失败:', error)
      // 处理错误
    }
  }
})
</script>

## 注意事项

1. 回调地址要求
   - 必须使用 https 协议
   - 域名必须有 ICP 备案
   - 完整的URL（例如：https://your-domain.com/pages/wechat-auth/callback）
   - 回调地址在调用获取授权链接接口时动态传入

2. web-view使用
   - 确保在pages.json中配置了web-view组件
   - 在APP中使用时需要配置相应的域名白名单
   - 微信小程序中使用需要配置业务域名

3. 授权流程
   - 建议在进入授权页面前先检查是否已有授权信息
   - 授权成功后需要妥善保存授权信息
   - 可以在全局状态管理中维护授权状态

4. 安全性
   - 不要在前端存储敏感信息
   - 建议对回调接口添加额外的安全验证
   - 注意处理授权失败的情况

## 调试建议

1. 使用开发者工具
   - 微信开发者工具可以调试web-view
   - 可以使用抓包工具查看请求

2. 常见问题
   - 回调地址必须完整，包含协议头
   - 注意URL编码问题
   - 注意跨域问题的处理

3. 测试流程
   - 先使用测试号进行开发
   - 确保各个环节都有适当的错误处理
   - 测试不同场景下的授权流程 
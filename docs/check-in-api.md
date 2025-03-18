# 签到系统 API 文档

## 基础信息
- 基础路径: `/user/check-in`
- 所有接口都需要 JWT 认证
- 请求头需要包含: `Authorization: Bearer <token>`

## 接口列表

### 1. 执行签到
执行每日签到，获得积分奖励。

**请求信息**
- 方法: `POST`
- 路径: `/user/check-in`
- 请求头: 
  ```
  Authorization: Bearer <token>
  ```
- 请求体: 无

**响应信息**
```json
{
  "isSuccess": true,
  "message": "签到成功",
  "data": {
    "signInId": 1,
    "pointsEarned": 100,
    "signInDate": "2024-01-20",
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**错误响应**
```json
{
  "isSuccess": false,
  "message": "今日已经签到过了",
  "data": null
}
```

### 2. 查询签到历史
查询指定日期范围内的签到记录。

**请求信息**
- 方法: `GET`
- 路径: `/user/check-in/history`
- 请求头: 
  ```
  Authorization: Bearer <token>
  ```
- 查询参数:
  - `startDate`: 开始日期 (格式: YYYY-MM-DD)
  - `endDate`: 结束日期 (格式: YYYY-MM-DD)

**响应信息**
```json
{
  "isSuccess": true,
  "message": "获取签到历史成功",
  "data": [
    {
      "signInId": 1,
      "pointsEarned": 100,
      "signInDate": "2024-01-20",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    },
    // ... 更多记录
  ]
}
```

### 3. 获取签到统计信息
获取用户的签到统计信息，包括总签到次数、本月签到次数和连续签到天数。

**请求信息**
- 方法: `GET`
- 路径: `/user/check-in/stats`
- 请求头: 
  ```
  Authorization: Bearer <token>
  ```
- 请求体: 无

**响应信息**
```json
{
  "isSuccess": true,
  "message": "获取签到统计成功",
  "data": {
    "totalSignIns": 30,      // 总签到次数
    "monthlySignIns": 15,    // 本月签到次数
    "consecutiveDays": 5     // 连续签到天数
  }
}
```

## 注意事项

1. 签到奖励
   - 每次签到可获得 100 积分
   - 积分有效期为 30 天
   - 每日只能签到一次

2. 时间说明
   - 所有时间均使用 UTC 时间
   - 日期格式统一使用 YYYY-MM-DD
   - 时间戳格式统一使用 ISO 8601 标准

3. 错误处理
   - 所有接口在发生错误时会返回统一的错误格式
   - 常见错误包括：
     - 未登录或 token 失效
     - 用户不存在
     - 重复签到
     - 日期格式错误

4. 认证要求
   - 所有接口都需要有效的 JWT token
   - token 需要在请求头中以 Bearer 方式传递
   - token 有效期为 24 小时

## 示例代码

### 前端调用示例 (JavaScript/TypeScript)

```typescript
// 执行签到
async function performSignIn() {
  const response = await fetch('/user/check-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// 查询签到历史
async function getSignInHistory(startDate: string, endDate: string) {
  const response = await fetch(`/user/check-in/history?startDate=${startDate}&endDate=${endDate}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// 获取签到统计
async function getSignInStats() {
  const response = await fetch('/user/check-in/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
``` 
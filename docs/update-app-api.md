# APP 信息管理 API 文档

本文档详细说明了 APP 信息管理的增删改查 API 接口，供前端开发人员参考。

## 数据模型

### AppInfo APP信息实体

```typescript
{
    "version": string,              // APP版本号 (主键)
    "changelog": string,            // 更新日志
    "downloadUrl": string,          // APP下载地址
    "createdAt": Date               // 创建时间 (自动生成)
}
```

## API 接口

### 1. 添加APP信息

**接口描述**：添加新版本的APP信息

**请求方式**：POST

**接口路径**：`/sql/update-app/add-app-info`

**认证要求**：需要JWT认证

**请求参数**：

```typescript
{
    "version": string,              // 必填，APP版本号
    "changelog": string,            // 可选，更新日志
    "downloadUrl": string           // 必填，APP下载地址
}
```

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": {
        // 返回创建的APP信息完整数据，包含创建时间
        ...AppInfo
    }
}
```

**示例**：

```typescript
// 请求示例
{
    "version": "1.0.0",
    "changelog": "首次发布版本",
    "downloadUrl": "https://example.com/app/v1.0.0"
}

// 响应示例
{
    "isSuccess": true,
    "message": "APP信息添加成功",
    "data": {
        "version": "1.0.0",
        "changelog": "首次发布版本",
        "downloadUrl": "https://example.com/app/v1.0.0",
        "createdAt": "2023-10-01T08:00:00.000Z"
    }
}
```

### 2. 获取单个APP信息

**接口描述**：根据版本号获取特定版本的APP信息

**请求方式**：GET

**接口路径**：`/sql/update-app/get-app-info`

**认证要求**：无需认证

**请求参数**：

| 参数名 | 参数类型 | 是否必须 | 说明 |
|--------|---------|---------|------|
| version | string | 是 | APP版本号 |

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": {
        // 返回APP信息完整数据
        ...AppInfo
    }
}
```

### 3. 获取所有APP信息

**接口描述**：获取所有版本的APP信息列表，按版本号降序排列

**请求方式**：GET

**接口路径**：`/sql/update-app/get-all-app-info`

**认证要求**：无需认证

**请求参数**：无

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": [
        // 返回所有APP信息数组
        {...AppInfo},
        {...AppInfo},
        // ...
    ]
}
```

### 4. 获取最新版本APP信息

**接口描述**：获取最新版本的APP信息

**请求方式**：GET

**接口路径**：`/sql/update-app/get-latest-app-info`

**认证要求**：无需认证

**请求参数**：无

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": {
        // 返回最新版本的APP信息完整数据
        ...AppInfo
    }
}
```

### 5. 更新APP信息

**接口描述**：更新指定版本的APP信息

**请求方式**：POST

**接口路径**：`/sql/update-app/update-app-info`

**认证要求**：需要JWT认证

**请求参数**：

```typescript
{
    "version": string,              // 必填，要更新的APP版本号
    "updateData": {
        // 以下字段为可选，只更新提供的字段
        "changelog"?: string,
        "downloadUrl"?: string
    }
}
```

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": {
        // 返回更新后的APP信息完整数据
        ...AppInfo
    }
}
```

### 6. 删除APP信息

**接口描述**：删除指定版本的APP信息

**请求方式**：POST

**接口路径**：`/sql/update-app/delete-app-info`

**认证要求**：需要JWT认证

**请求参数**：

```typescript
{
    "version": string               // 必填，要删除的APP版本号
}
```

**响应结果**：

```typescript
{
    "isSuccess": boolean,           // 操作是否成功
    "message": string,              // 操作结果描述
    "data": {
        "version": string           // 被删除的版本号
    }
}
```

## 常见错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误，例如版本号为空 |
| 401 | 未授权（JWT token无效） |
| 404 | 指定版本的APP信息不存在 |
| 500 | 服务器内部错误 |

## 示例场景

### 示例1: 添加新版本APP信息

**请求**:
```http
POST /sql/update-app/add-app-info
Authorization: Bearer [JWT_TOKEN]
Content-Type: application/json

{
    "version": "1.1.0",
    "changelog": "1. 修复了登录问题\n2. 优化了界面显示\n3. 添加了新功能",
    "downloadUrl": "https://example.com/app/v1.1.0"
}
```

**响应**:
```json
{
    "isSuccess": true,
    "message": "APP信息添加成功",
    "data": {
        "version": "1.1.0",
        "changelog": "1. 修复了登录问题\n2. 优化了界面显示\n3. 添加了新功能",
        "downloadUrl": "https://example.com/app/v1.1.0",
        "createdAt": "2023-10-15T10:30:00.000Z"
    }
}
```

### 示例2: 获取最新版本APP信息

**请求**:
```http
GET /sql/update-app/get-latest-app-info
```

**响应**:
```json
{
    "isSuccess": true,
    "message": "获取最新APP信息成功",
    "data": {
        "version": "1.1.0",
        "changelog": "1. 修复了登录问题\n2. 优化了界面显示\n3. 添加了新功能",
        "downloadUrl": "https://example.com/app/v1.1.0",
        "createdAt": "2023-10-15T10:30:00.000Z"
    }
}
```

## 使用建议

1. 前端应用启动时，可以调用 `get-latest-app-info` 接口检查是否有新版本
2. 如需展示版本历史，可以调用 `get-all-app-info` 接口获取所有版本信息
3. 管理后台可以使用 `add-app-info`, `update-app-info` 和 `delete-app-info` 接口进行版本管理 
# API密钥管理接口文档

本文档详细说明API密钥管理相关的接口，包括创建、更新、删除和查询API密钥的功能。

## 基础信息

- 基础URL: `https://so-back.clouddreamai.com`
- 认证方式: 所有接口需要在请求头中添加 `Authorization: Bearer {token}` 进行身份验证
- 响应格式: 所有接口返回格式统一为 
  ```
  {
    isSuccess: boolean,  // 操作是否成功
    message: string,     // 成功/错误信息
    data: any            // 返回数据，失败时为null
  }
  ```

## 接口列表

### 1. 创建API密钥

- **URL**: `/app-tools/chat/api/create`
- **方法**: `POST`
- **描述**: 创建一个新的API密钥

#### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|-------|------|------|------|
| name | string | 是 | API密钥名称 |
| description | string | 否 | API密钥描述 |
| modelId | string | 是 | 模型ID |
| knowledgeBaseIds | string[] | 是 | 知识库ID列表 |
| expiresAt | string | 否 | 过期时间，ISO格式的日期字符串 |

#### 请求示例

```
POST https://so-back.clouddreamai.com/app-tools/chat/api/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "测试API密钥",
  "description": "这是一个用于测试的API密钥",
  "modelId": "gpt-3.5-turbo",
  "knowledgeBaseIds": ["kb-123", "kb-456"],
  "expiresAt": "2023-12-31T23:59:59Z"
}
```

#### 响应示例

```
{
  "isSuccess": true,
  "message": "创建API密钥成功",
  "data": {
    "apiKeyId": 1,
    "apiKey": "so-a1b2c3d4...",
    "apiKeyUserId": 100,
    "apiKeyName": "测试API密钥",
    "apiKeyDescription": "这是一个用于测试的API密钥",
    "apiKeyModelId": "gpt-3.5-turbo",
    "apiKeyKnowledgeBaseIds": ["kb-123", "kb-456"],
    "apiKeyEnabled": true,
    "apiKeyExpiresAt": "2023-12-31T23:59:59.000Z",
    "apiKeyUsageCount": 0,
    "apiKeyLastUsedAt": null,
    "apiKeyCreatedAt": "2023-06-01T12:00:00.000Z",
    "apiKeyUpdatedAt": "2023-06-01T12:00:00.000Z"
  }
}
```

### 2. 更新API密钥

- **URL**: `/app-tools/chat/api/update`
- **方法**: `POST`
- **描述**: 更新指定API密钥的信息，支持部分更新

#### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|-------|------|------|------|
| apiKeyId | number | 是 | 要更新的API密钥ID |
| name | string | 否 | 新的API密钥名称 |
| description | string | 否 | 新的API密钥描述 |
| modelId | string | 否 | 新的模型ID |
| knowledgeBaseIds | string[] | 否 | 新的知识库ID数组 |
| enabled | boolean | 否 | 是否启用 |
| expiresAt | string | 否 | 新的过期时间 |

#### 请求示例

```
POST https://so-back.clouddreamai.com/app-tools/chat/api/update
Content-Type: application/json
Authorization: Bearer {token}

{
  "apiKeyId": 1,
  "name": "更新后的API密钥名称",
  "description": "更新后的描述信息",
  "modelId": "gpt-4",
  "knowledgeBaseIds": ["kb-789"],
  "enabled": true,
  "expiresAt": "2024-06-30T23:59:59Z"
}
```

#### 响应示例

```
{
  "isSuccess": true,
  "message": "更新API密钥成功",
  "data": {
    "apiKeyId": 1,
    "apiKey": "so-a1b2c3d4...",
    "apiKeyUserId": 100,
    "apiKeyName": "更新后的API密钥名称",
    "apiKeyDescription": "更新后的描述信息",
    "apiKeyModelId": "gpt-4",
    "apiKeyKnowledgeBaseIds": ["kb-789"],
    "apiKeyEnabled": true,
    "apiKeyExpiresAt": "2024-06-30T23:59:59.000Z",
    "apiKeyUsageCount": 0,
    "apiKeyLastUsedAt": null,
    "apiKeyCreatedAt": "2023-06-01T12:00:00.000Z",
    "apiKeyUpdatedAt": "2023-06-01T13:30:00.000Z"
  }
}
```

### 3. 删除API密钥

- **URL**: `/app-tools/chat/api/delete`
- **方法**: `POST`
- **描述**: 删除指定的API密钥

#### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|-------|------|------|------|
| apiKeyId | number | 是 | 要删除的API密钥ID |

#### 请求示例

```
POST https://so-back.clouddreamai.com/app-tools/chat/api/delete
Content-Type: application/json
Authorization: Bearer {token}

{
  "apiKeyId": 1
}
```

#### 响应示例

```
{
  "isSuccess": true,
  "message": "删除API密钥成功",
  "data": null
}
```

### 4. 获取API密钥列表

- **URL**: `/app-tools/chat/api/list`
- **方法**: `GET`
- **描述**: 获取当前用户所有的API密钥列表

#### 请求参数

无

#### 请求示例

```
GET https://so-back.clouddreamai.com/app-tools/chat/api/list
Authorization: Bearer {token}
```

#### 响应示例

```
{
  "isSuccess": true,
  "message": "获取API密钥列表成功",
  "data": [
    {
      "apiKeyId": 2,
      "apiKey": "so-e5f6g7h8...",
      "apiKeyUserId": 100,
      "apiKeyName": "生产环境API密钥",
      "apiKeyDescription": "用于生产环境的访问",
      "apiKeyModelId": "gpt-4",
      "apiKeyKnowledgeBaseIds": ["kb-001", "kb-002"],
      "apiKeyEnabled": true,
      "apiKeyExpiresAt": "2024-12-31T23:59:59.000Z",
      "apiKeyUsageCount": 15,
      "apiKeyLastUsedAt": "2023-06-01T10:30:00.000Z",
      "apiKeyCreatedAt": "2023-05-15T09:00:00.000Z",
      "apiKeyUpdatedAt": "2023-06-01T10:30:00.000Z"
    },
    {
      "apiKeyId": 3,
      "apiKey": "so-i9j0k1l2...",
      "apiKeyUserId": 100,
      "apiKeyName": "测试环境API密钥",
      "apiKeyDescription": "用于测试环境的访问",
      "apiKeyModelId": "gpt-3.5-turbo",
      "apiKeyKnowledgeBaseIds": ["kb-test-001"],
      "apiKeyEnabled": true,
      "apiKeyExpiresAt": "2023-12-31T23:59:59.000Z",
      "apiKeyUsageCount": 8,
      "apiKeyLastUsedAt": "2023-05-28T15:45:00.000Z",
      "apiKeyCreatedAt": "2023-05-20T14:20:00.000Z",
      "apiKeyUpdatedAt": "2023-05-28T15:45:00.000Z"
    }
  ]
}
```

## 字段说明

### API密钥对象字段说明

| 字段名 | 类型 | 描述 |
|-------|------|------|
| apiKeyId | number | API密钥ID |
| apiKey | string | API密钥值，格式为"so-xxx..." |
| apiKeyUserId | number | 所属用户ID |
| apiKeyName | string | API密钥名称 |
| apiKeyDescription | string | API密钥描述 |
| apiKeyModelId | string | 关联的模型ID |
| apiKeyKnowledgeBaseIds | string[] | 关联的知识库ID列表 |
| apiKeyEnabled | boolean | 是否启用 |
| apiKeyExpiresAt | string | 过期时间 |
| apiKeyUsageCount | number | 使用次数 |
| apiKeyLastUsedAt | string | 最后使用时间 |
| apiKeyCreatedAt | string | 创建时间 |
| apiKeyUpdatedAt | string | 更新时间 |

## 注意事项

1. 所有接口都需要用户认证，请确保在请求头中包含有效的JWT token
2. API密钥创建后，密钥值（apiKey）只会在创建时完整返回，请妥善保存
3. 更新接口支持部分更新，只需要传入需要更新的字段即可
4. 日期字段采用ISO格式（如 `2023-12-31T23:59:59Z`）
5. 删除操作不可恢复，请谨慎操作 
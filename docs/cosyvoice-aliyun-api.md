# 阿里云CosyVoice语音合成API文档 阿里云CosyVoice语音合成API文档

本文档描述了与阿里云CosyVoice语音合成服务相关的API接口。服务提供语音合成能力，支持多种音色选择，包括系统预设音色和用户自定义音色。

## 基础信息

- 基础URL: `https://so-back.clouddreamai.com/app-tools/cosyvoice-aliyun`
- 认证方式: JWT Bearer Token (除公开接口外的所有接口都需要在Header中携带`Authorization: Bearer {TOKEN}`)
- 响应格式: JSON

## 接口列表

### 1. 获取语音列表（需登录）

获取所有支持的语音列表，包括系统预设音色和用户自定义音色。用户自定义音色会放置在列表前面（置顶）。

**接口URL:**
```
GET /voice-list
```

**请求头:**
```
Authorization: Bearer {YOUR_JWT_TOKEN}
```

**请求参数:** 无

**响应数据:**
```json
{
  "isSuccess": true,
  "message": "获取语音列表成功",
  "data": [
    {
      "id": "custom-voice-123456",
      "name": "我的专属音色",
      "gender": "unknown",
      "description": "用户自定义音色",
      "sample_url": "",
      "model": "cosyvoice-v1",
      "scenarios": ["语音助手", "聊天数字人", "自定义应用"],
      "language": "中文",
      "default_sample_rate": 22050,
      "default_format": "mp3",
      "is_custom": true,
      "create_time": "2023-09-01T12:00:00.000Z",
      "update_time": "2023-09-01T12:00:00.000Z"
    },
    {
      "id": "longwan",
      "name": "龙婉",
      "gender": "female",
      "description": "标准女声",
      "sample_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20240830/dzkngm/%E9%BE%99%E5%A9%89.mp3",
      "model": "cosyvoice-v1",
      "scenarios": ["语音助手", "导航播报", "聊天数字人"],
      "language": "中文普通话",
      "default_sample_rate": 22050,
      "default_format": "mp3",
      "is_custom": false
    }
    // ... 更多音色
  ]
}
```

### 2. 获取公开语音列表（无需登录）

获取系统预设音色列表，无需登录。

**接口URL:**
```
GET /public-voice-list
```

**请求参数:** 无

**响应数据:**
```json
{
  "isSuccess": true,
  "message": "获取语音列表成功",
  "data": [
    {
      "id": "longwan",
      "name": "龙婉",
      "gender": "female",
      "description": "标准女声",
      "sample_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20240830/dzkngm/%E9%BE%99%E5%A9%89.mp3",
      "model": "cosyvoice-v1",
      "scenarios": ["语音助手", "导航播报", "聊天数字人"],
      "language": "中文普通话",
      "default_sample_rate": 22050,
      "default_format": "mp3",
      "is_custom": false
    }
    // ... 更多系统音色
  ]
}
```

### 3. 提交语音合成任务

提交文本转语音合成任务，支持选择不同的音色、格式和参数配置。

**接口URL:**
```
POST /start
```

**请求头:**
```
Authorization: Bearer {YOUR_JWT_TOKEN}
Content-Type: application/json
```

**请求参数:**
```json
{
  "text": "需要合成语音的文本内容",
  "voice": "longwan",
  "format": "mp3",
  "sample_rate": 22050,
  "volume": 50,
  "rate": 1,
  "pitch": 1
}
```

| 参数 | 类型 | 必需 | 描述 |
| --- | --- | --- | --- |
| text | string | 是 | 需要合成语音的文本内容 |
| voice | string | 否 | 音色ID，默认为系统配置音色 |
| format | string | 否 | 音频格式，支持mp3或wav，默认mp3 |
| sample_rate | number | 否 | 采样率，默认22050Hz |
| volume | number | 否 | 音量，范围0-100，默认50 |
| rate | number | 否 | 语速，范围0.5-2.0，默认1.0 |
| pitch | number | 否 | 音调，范围0.5-2.0，默认1.0 |

**响应数据:**
```json
{
  "isSuccess": true,
  "message": "提交语音合成任务成功",
  "data": 12345  // 任务记录ID，用于后续查询
}
```

### 4. 批量提交语音合成任务

批量提交多个文本转语音合成任务，支持为每条文本单独配置音色和参数。所有合成结果将保存在同一个历史记录中。

**接口URL:**
```
POST /batch-start
```

**请求头:**
```
Authorization: Bearer {YOUR_JWT_TOKEN}
Content-Type: application/json
```

**请求参数:**
```json
{
  "items": [
    {
      "text": "第一条文本内容",
      "voice": "xiaoyun",
      "format": "mp3",
      "volume": 50
    },
    {
      "text": "第二条文本内容",
      "voice": "longwan",
      "format": "wav",
      "rate": 1.2
    },
    {
      "text": "第三条文本内容"
    }
  ]
}
```

| 参数 | 类型 | 必需 | 描述 |
| --- | --- | --- | --- |
| items | array | 是 | 包含多个合成项的数组 |
| items[].text | string | 是 | 需要合成语音的文本内容 |
| items[].voice | string | 否 | 音色ID，默认为系统配置音色 |
| items[].format | string | 否 | 音频格式，支持mp3或wav，默认mp3 |
| items[].sample_rate | number | 否 | 采样率，默认22050Hz |
| items[].volume | number | 否 | 音量，范围0-100，默认50 |
| items[].rate | number | 否 | 语速，范围0.5-2.0，默认1.0 |
| items[].pitch | number | 否 | 音调，范围0.5-2.0，默认1.0 |

**响应数据:**
```json
{
  "isSuccess": true,
  "message": "提交批量语音合成任务成功",
  "data": 12345  // 任务记录ID，用于后续查询
}
```

### 5. 查询任务状态

查询已提交的语音合成任务状态。

**接口URL:**
```
POST /query
```

**请求头:**
```
Authorization: Bearer {YOUR_JWT_TOKEN}
Content-Type: application/json
```

**请求参数:**
```json
{
  "taskId": 12345
}
```

| 参数 | 类型 | 必需 | 描述 |
| --- | --- | --- | --- |
| taskId | number | 是 | 任务记录ID，从提交任务接口返回获取 |

**响应数据:**

成功完成的单个任务：
```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 1001,
    "historyAppId": 24,
    "historyStatus": "completed",
    "historyStartTime": "2023-09-01T12:00:00.000Z",
    "historyUseTime": 1500,
    "historyUsePoints": 10,
    "historyResult": [
      {
        "taskId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "outputUrl": "https://storage-url.com/path/to/audio.mp3",
        "text": "需要合成语音的文本内容",
        "characterCount": 100,
        "createdAt": "2023-09-01T12:00:00.000Z",
        "updatedAt": "2023-09-01T12:01:30.000Z"
      }
    ],
    "historyErrorInfos": []
  }
}
```

成功完成的批量任务：
```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 1001,
    "historyAppId": 24,
    "historyStatus": "completed",
    "historyStartTime": "2023-09-01T12:00:00.000Z",
    "historyUseTime": 5500,
    "historyUsePoints": 30,
    "historyResult": [
      {
        "taskId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "outputUrl": "https://storage-url.com/path/to/audio1.mp3",
        "text": "第一条文本内容",
        "characterCount": 100,
        "createdAt": "2023-09-01T12:00:00.000Z",
        "updatedAt": "2023-09-01T12:01:30.000Z"
      },
      {
        "taskId": "550e8400-e29b-41d4-a716-446655440001",
        "status": "completed",
        "outputUrl": "https://storage-url.com/path/to/audio2.wav",
        "text": "第二条文本内容",
        "characterCount": 150,
        "createdAt": "2023-09-01T12:00:00.000Z",
        "updatedAt": "2023-09-01T12:02:00.000Z"
      },
      {
        "taskId": "550e8400-e29b-41d4-a716-446655440002",
        "status": "completed",
        "outputUrl": "https://storage-url.com/path/to/audio3.mp3",
        "text": "第三条文本内容",
        "characterCount": 50,
        "createdAt": "2023-09-01T12:00:00.000Z",
        "updatedAt": "2023-09-01T12:01:00.000Z"
      }
    ],
    "historyErrorInfos": []
  }
}
```

处理中的任务：
```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 1001,
    "historyAppId": 24,
    "historyStatus": "processing",
    "historyStartTime": "2023-09-01T12:00:00.000Z",
    "historyUseTime": 0,
    "historyUsePoints": 10,
    "historyResult": [
      {
        "taskId": "550e8400-e29b-41d4-a716-446655440000",
        "text": "需要合成语音的文本内容",
        "status": "processing"
      }
    ],
    "historyErrorInfos": []
  }
}
```

失败的任务：
```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 1001,
    "historyAppId": 24,
    "historyStatus": "failed",
    "historyStartTime": "2023-09-01T12:00:00.000Z",
    "historyUseTime": 500,
    "historyUsePoints": 0,
    "historyResult": [],
    "historyErrorInfos": [
      {
        "errorMessage": "语音合成失败: Invalid payload data",
        "errorDetails": {
          "error_code": "InvalidPayload",
          "error_message": "Invalid payload data"
        }
      }
    ]
  }
}
```

## 错误码说明

| 错误码 | 描述 | 解决方案 |
| --- | --- | --- |
| InvalidPayload | 无效的请求参数 | 检查参数格式和值是否正确 |
| PointsNotEnough | 用户点数不足 | 充值点数后重试 |
| TaskFailed | 任务执行失败 | 检查请求参数，特别是文本内容是否包含特殊字符 |
| ConnectionError | 连接错误 | 稍后重试，或联系管理员 |
| Timeout | 任务执行超时 | 尝试减少文本长度，或分多次合成 |

## 注意事项

1. 文本长度建议控制在1000字以内，过长的文本可能导致处理时间延长或超时。
2. 自定义音色仅对已登录用户并且该音色属于该用户有效。
3. 音频格式为mp3时，每个字符消耗0.1点；为wav时，每个字符消耗0.05点。
4. 单个任务执行有2分钟超时限制，批量任务中的每个单独任务有1分钟超时限制。
5. 批量任务会并行处理所有文本，可以提高处理效率，但也会消耗更多的系统资源。
6. 同一批量任务中，即使某些文本处理失败，其他成功处理的结果仍然会保存。 
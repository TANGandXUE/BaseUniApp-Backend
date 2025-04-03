# 图片数字人API文档

## 概述

图片数字人API允许用户通过上传静态图片创建数字人视频，支持文本驱动和音频驱动两种方式。

## 接口列表

### 1. 提交视频合成任务

**接口路径**: `POST /app-tools/digital-human/img-start`

**功能说明**: 提交图片数字人视频合成任务，返回任务ID

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| inputImageUrl | string | 是 | 输入图片URL，支持网络图片地址 |
| driveType | string | 否 | 驱动类型，可选值: TEXT(文本驱动)、VOICE(音频驱动)，默认为TEXT |
| text | string | 条件必填 | 当driveType为TEXT时必填，数字人要说的文本内容 |
| ttsParams | object | 条件必填 | 当driveType为TEXT时必填，TTS参数 |
| ttsParams.person | string | 否 | 发音人ID，可通过voice-list接口获取可用发音人 |
| ttsParams.speed | string | 否 | 语速，范围0-15，默认5 |
| ttsParams.volume | string | 否 | 音量，范围0-15，默认5 |
| ttsParams.pitch | string | 否 | 语调，范围0-15，默认5 |
| inputAudioUrl | string | 条件必填 | 当driveType为VOICE时必填，驱动音频URL |
| callbackUrl | string | 否 | 任务完成回调通知URL |

**请求示例**:

```json
{
  "inputImageUrl": "https://example.com/image.jpg",
  "driveType": "TEXT",
  "text": "欢迎使用图片数字人服务，我是您的虚拟助手。",
  "ttsParams": {
    "person": "10000000",
    "speed": "5",
    "volume": "5",
    "pitch": "5"
  }
}
```

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | number | 任务历史ID，用于查询任务状态 |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "提交图片数字人合成任务成功",
  "data": 12345
}
```

### 2. 查询任务状态

**接口路径**: `POST /app-tools/digital-human/img-query`

**功能说明**: 查询图片数字人视频合成任务状态

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| taskId | string | 是 | 任务ID，即提交任务返回的data值 |

**请求示例**:

```json
{
  "taskId": "12345"
}
```

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | object | 任务详情 |
| data.historyId | number | 任务历史ID |
| data.historyUserId | number | 用户ID |
| data.historyAppId | number | 应用ID |
| data.historyStatus | string | 任务状态，可能值: processing(处理中)、completed(完成)、failed(失败) |
| data.historyStartTime | string | 任务开始时间 |
| data.historyUseTime | number | 任务耗时(毫秒) |
| data.historyResult | array | 任务结果 |
| data.historyResult[0].taskId | string | 任务ID |
| data.historyResult[0].status | string | 状态 |
| data.historyResult[0].outputUrl | string | 输出视频URL |
| data.historyResult[0].duration | number | 视频时长(毫秒) |
| data.historyResult[0].subtitleFileUrl | string | 字幕文件URL |
| data.historyErrorInfos | array | 错误信息(如有) |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 10001,
    "historyAppId": 1,
    "historyStatus": "completed",
    "historyStartTime": "2023-01-01T12:00:00.000Z",
    "historyUseTime": 60000,
    "historyResult": [
      {
        "taskId": "vf3-abcd1234",
        "status": "SUCCESS",
        "outputUrl": "https://example.com/output.mp4",
        "duration": 15000,
        "subtitleFileUrl": "https://example.com/subtitle.srt"
      }
    ],
    "historyErrorInfos": []
  }
}
```

### 3. 获取默认图片列表

**接口路径**: `GET /app-tools/digital-human/img-default-list`

**功能说明**: 获取图片数字人可用的默认图片列表

**请求参数**: 无

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | array | 默认图片列表 |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "获取默认图片列表成功",
  "data": [
    {
      "id": 1,
      "name": "默认图片1",
      "url": "https://example.com/default1.jpg"
    },
    {
      "id": 2,
      "name": "默认图片2",
      "url": "https://example.com/default2.jpg"
    }
  ]
}
```

## 使用流程

1. 通过`img-default-list`接口获取可用的默认图片，或准备自己的图片URL
2. 通过`voice-list`接口获取可用的发音人列表
3. 调用`img-start`接口提交视频合成任务，获取任务ID
4. 使用`img-query`接口查询任务状态，直到任务完成
5. 从任务查询结果中获取输出视频URL进行播放或下载

## 注意事项

1. 任务处理时间取决于图片大小、文本长度等因素，通常需要几分钟到数十分钟不等
2. 生成的视频有有效期限制，建议及时下载保存
3. 使用文本驱动时，建议文本长度适中，太长可能导致生成时间过长
4. 上传的图片需符合平台规定的格式和内容要求 
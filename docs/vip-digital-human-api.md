# 精品数字人API文档

## 概述

精品数字人API提供高质量数字人视频合成服务，支持多种数字人形象选择，可通过文本或音频进行驱动，支持透明背景等高级特性。

## 接口列表

### 1. 提交视频合成任务

**接口路径**: `POST /app-tools/digital-human/vip-start`

**功能说明**: 提交精品数字人视频合成任务，返回任务ID

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| figureId | string | 是 | 数字人ID，可通过vip-figure-list接口获取 |
| driveType | string | 否 | 驱动类型，可选值: TEXT(文本驱动)、VOICE(音频驱动)，默认为TEXT |
| text | string | 条件必填 | 当driveType为TEXT时必填，数字人要说的文本内容 |
| ttsParams | object | 条件必填 | 当driveType为TEXT时必填，TTS参数 |
| ttsParams.person | string | 否 | 发音人ID，可通过voice-list接口获取可用发音人 |
| ttsParams.speed | string | 否 | 语速，范围0-15，默认5 |
| ttsParams.volume | string | 否 | 音量，范围0-15，默认5 |
| ttsParams.pitch | string | 否 | 语调，范围0-15，默认5 |
| inputAudioUrl | string | 条件必填 | 当driveType为VOICE时必填，驱动音频URL |
| videoParams | object | 是 | 视频参数 |
| videoParams.width | number | 是 | 视频宽度 |
| videoParams.height | number | 是 | 视频高度 |
| videoParams.transparent | boolean | 否 | 是否使用透明背景 |
| dhParams | object | 否 | 数字人参数 |
| dhParams.cameraId | number | 否 | 相机ID |
| dhParams.position | object | 否 | 数字人位置 |
| dhParams.position.x | number | 否 | X轴位置 |
| dhParams.position.y | number | 否 | Y轴位置 |
| dhParams.position.z | number | 否 | Z轴位置 |
| subtitleParams | object | 否 | 字幕参数 |
| subtitleParams.subtitlePolicy | string | 否 | 字幕策略 |
| subtitleParams.enabled | boolean | 否 | 是否启用字幕 |
| backgroundImageUrl | string | 否 | 背景图片URL |
| callbackUrl | string | 否 | 任务完成回调通知URL |
| autoAnimoji | boolean | 否 | 是否启用自动表情 |
| enablePalindrome | boolean | 否 | 是否启用回文播放 |

**请求示例**:

```json
{
  "figureId": "10001",
  "driveType": "TEXT",
  "text": "精品数字人为您提供专业服务，欢迎使用！",
  "ttsParams": {
    "person": "10000000",
    "speed": "5",
    "volume": "5",
    "pitch": "5"
  },
  "videoParams": {
    "width": 1080,
    "height": 1920,
    "transparent": false
  },
  "backgroundImageUrl": "https://example.com/background.jpg"
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
  "message": "提交精品数字人合成任务成功",
  "data": 12345
}
```

### 2. 查询任务状态

**接口路径**: `POST /app-tools/digital-human/vip-query`

**功能说明**: 查询精品数字人视频合成任务状态

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
    "historyAppId": 2,
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

### 3. 获取默认数字人列表

**接口路径**: `GET /app-tools/digital-human/vip-figure-list`

**功能说明**: 获取可用的精品数字人形象列表

**请求参数**: 无

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | array | 数字人列表 |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "获取默认数字人列表成功",
  "data": [
    {
      "id": "1001",
      "name": "数字人形象1",
      "previewUrl": "https://example.com/preview1.jpg",
      "gender": "female",
      "category": "host"
    },
    {
      "id": "1002",
      "name": "数字人形象2",
      "previewUrl": "https://example.com/preview2.jpg",
      "gender": "male",
      "category": "host"
    }
  ]
}
```

## 使用流程

1. 通过`vip-figure-list`接口获取可用的数字人形象列表
2. 通过`voice-list`接口获取可用的发音人列表
3. 通过`bg-list`接口获取可用的背景图片(可选)
4. 调用`vip-start`接口提交视频合成任务，获取任务ID
5. 使用`vip-query`接口查询任务状态，直到任务完成
6. 从任务查询结果中获取输出视频URL进行播放或下载

## 注意事项

1. 精品数字人支持透明背景选项，可以与您自己的背景进行合成
2. 视频分辨率建议选择常见比例如16:9或9:16，以获得最佳效果
3. 若需使用自定义音频驱动，请确保音频质量清晰，杂音少
4. 生成的视频文件有存储期限，请及时下载保存
5. 不同数字人形象可能有不同的表现特点，建议测试后选择最合适的形象 
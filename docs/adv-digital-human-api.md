# 高级数字人API文档

## 概述

高级数字人API提供丰富的视频合成功能，支持模板化视频创建，可添加片头片尾素材，支持拼接多种素材，适用于广告宣传、营销活动等专业场景。

## 接口列表

### 1. 提交视频合成任务

**接口路径**: `POST /app-tools/digital-human/adv-start`

**功能说明**: 提交高级数字人视频合成任务，返回任务ID列表

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| figureId | string | 是 | 数字人ID |
| templateId | string | 是 | 模板ID，可通过adv-template-list接口获取 |
| driveType | string | 否 | 驱动类型，可选值: TEXT(文本驱动)、VOICE(音频驱动)，默认为TEXT |
| text | string | 条件必填 | 当driveType为TEXT时必填，数字人要说的文本内容 |
| inputAudioUrl | string | 条件必填 | 当driveType为VOICE时必填，驱动音频URL |
| title | string | 否 | 视频标题 |
| logoParams | object | 否 | Logo参数 |
| logoParams.logoUrl | string | 是 | Logo图片URL |
| bgmParams | object | 否 | 背景音乐参数 |
| bgmParams.bgmUrl | string | 是 | 背景音乐URL |
| materialUrl | string | 否 | 素材URL |
| ttsParams | object | 条件必填 | 当driveType为TEXT时必填，TTS参数 |
| ttsParams.person | string | 否 | 发音人ID，可通过voice-list接口获取可用发音人 |
| ttsParams.speed | string | 否 | 语速，范围0-15，默认5 |
| ttsParams.volume | string | 否 | 音量，范围0-15，默认5 |
| ttsParams.pitch | string | 否 | 语调，范围0-15，默认5 |
| videoParams | object | 是 | 视频参数 |
| videoParams.width | number | 是 | 视频宽度 |
| videoParams.height | number | 是 | 视频高度 |
| riskTip | string | 否 | 风险提示文本 |
| openingMaterial | object | 否 | 片头素材 |
| openingMaterial.fileId | string | 否 | 片头素材文件ID |
| openingMaterial.fileUrl | string | 否 | 片头素材URL |
| openingMaterial.mediaType | string | 是 | 媒体类型，固定值"VIDEO" |
| endingMaterial | object | 否 | 片尾素材 |
| endingMaterial.fileId | string | 否 | 片尾素材文件ID |
| endingMaterial.fileUrl | string | 否 | 片尾素材URL |
| endingMaterial.mediaType | string | 是 | 媒体类型，固定值"VIDEO" |
| mashupMaterials | array | 否 | 拼接素材列表 |
| mashupMaterials[].fileId | string | 否 | 素材文件ID |
| mashupMaterials[].fileUrl | string | 否 | 素材URL |
| mashupMaterials[].mediaType | string | 是 | 媒体类型，可选值"VIDEO"或"IMAGE" |
| fissionParams | object | 否 | 裂变参数，用于批量生成多个相似视频 |
| fissionParams.figureIds | array | 是 | 数字人ID列表 |
| fissionParams.ttsPersons | array | 否 | 发音人ID列表 |
| callbackUrl | string | 否 | 任务完成回调通知URL |

**请求示例**:

```json
{
  "figureId": "10001",
  "templateId": "template001",
  "driveType": "TEXT",
  "text": "欢迎使用高级数字人服务，我们提供专业的视频合成解决方案。",
  "title": "产品介绍视频",
  "ttsParams": {
    "person": "10000000",
    "speed": "5",
    "volume": "5",
    "pitch": "5"
  },
  "videoParams": {
    "width": 1920,
    "height": 1080
  },
  "openingMaterial": {
    "fileUrl": "https://example.com/opening.mp4",
    "mediaType": "VIDEO"
  },
  "endingMaterial": {
    "fileUrl": "https://example.com/ending.mp4",
    "mediaType": "VIDEO"
  }
}
```

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | array | 任务历史ID列表，用于查询任务状态 |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "提交高级数字人合成任务成功",
  "data": [12345]
}
```

### 2. 查询任务状态

**接口路径**: `POST /app-tools/digital-human/adv-query`

**功能说明**: 查询高级数字人视频合成任务状态

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| taskId | string | 是 | 任务ID，即提交任务返回的data数组中的元素 |

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
| data.historyResult[0].figureId | string | 数字人ID(裂变任务时有此字段) |
| data.historyResult[0].ttsPerson | string | 发音人ID(裂变任务时有此字段) |
| data.historyErrorInfos | array | 错误信息(如有) |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "查询任务状态成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 10001,
    "historyAppId": 7,
    "historyStatus": "completed",
    "historyStartTime": "2023-01-01T12:00:00.000Z",
    "historyUseTime": 90000,
    "historyResult": [
      {
        "taskId": "vf3-abcd1234",
        "status": "SUCCESS",
        "outputUrl": "https://example.com/output.mp4",
        "duration": 30000,
        "subtitleFileUrl": "https://example.com/subtitle.srt"
      }
    ],
    "historyErrorInfos": []
  }
}
```

### 3. 获取模板列表

**接口路径**: `GET /app-tools/digital-human/adv-template-list`

**功能说明**: 获取高级数字人可用的模板列表

**请求参数**: 无

**返回参数**:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| isSuccess | boolean | 是否成功 |
| message | string | 提示信息 |
| data | array | 模板列表 |

**返回示例**:

```json
{
  "isSuccess": true,
  "message": "获取高级数字人模板列表成功",
  "data": [
    {
      "id": "template001",
      "name": "企业宣传模板",
      "previewUrl": "https://example.com/template1.jpg",
      "category": "business"
    },
    {
      "id": "template002",
      "name": "产品介绍模板",
      "previewUrl": "https://example.com/template2.jpg",
      "category": "product"
    }
  ]
}
```

## 使用流程

1. 通过`adv-template-list`接口获取可用的模板列表
2. 通过`voice-list`接口获取可用的发音人列表
3. 准备所需的素材，包括片头片尾视频、背景音乐等
4. 调用`adv-start`接口提交视频合成任务，获取任务ID
5. 使用`adv-query`接口查询任务状态，直到任务完成
6. 从任务查询结果中获取输出视频URL进行播放或下载

## 高级功能

### 裂变功能

裂变功能允许您在一次请求中生成多个相似但使用不同数字人或不同发音人的视频，适用于批量生成营销内容。

使用方法：
1. 在请求中添加`fissionParams`参数
2. 设置`figureIds`数组，包含所有需要生成的数字人ID
3. 可选设置`ttsPersons`数组，包含需要使用的发音人ID
4. 系统将根据数字人和发音人的组合，生成多个视频

注意：裂变功能会根据生成的视频数量扣除相应的点数，请确保账户余额充足。

### 素材拼接

高级数字人支持复杂的素材拼接功能：
1. 添加片头视频(`openingMaterial`)
2. 添加片尾视频(`endingMaterial`)
3. 添加多个中间素材(`mashupMaterials`)
4. 支持视频和图片混合拼接

## 注意事项

1. 高级数字人任务处理时间通常较长，特别是包含多个素材拼接的任务
2. 使用裂变功能时，请注意每个任务都会消耗点数
3. 视频素材和图片素材应符合平台规格要求，避免过大或格式不支持
4. 生成的视频文件有存储期限，请及时下载保存
5. 模板的选择会影响最终视频的风格和效果，建议根据需求选择合适的模板 
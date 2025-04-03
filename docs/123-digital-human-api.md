# 123数字人API文档

## 概述

123数字人API提供快速视频合成服务，只需对着镜头说十秒"123"，即可快速输出口播成片。支持文本驱动和音频驱动两种方式，固定使用底板视频进行合成。

## 接口列表

### 1. 提交视频合成任务

**接口路径**: `POST /app-tools/digital-human/123-start`

**功能说明**: 提交123数字人视频合成任务，返回任务ID和底板ID

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| templateVideoId | string | 条件必填 | 底板视频素材文件ID，和templateId参数二选一必填 |
| templateId | string | 条件必填 | 底板ID，使用templateVideoId合成视频后会返回，可反复用于生成视频，和templateVideoId参数二选一必填 |
| driveType | string | 否 | 驱动类型，可选值: TEXT(文本驱动)、VOICE(音频驱动)，默认为TEXT |
| text | string | 条件必填 | 当driveType为TEXT时必填，数字人要说的文本内容，字符长度不超过20000 |
| ttsParams | object | 条件必填 | 当driveType为TEXT时必填，TTS参数 |
| ttsParams.person | string | 否 | 发音人ID，可通过voice-list接口获取可用发音人 |
| ttsParams.speed | string | 否 | 语速，范围0-15，默认5 |
| ttsParams.volume | string | 否 | 音量，范围0-15，默认5 |
| ttsParams.pitch | string | 否 | 语调，范围0-15，默认5 |
| inputAudioUrl | string | 条件必填 | 当driveType为VOICE时必填，驱动音频URL |
| videoParams | object | 是 | 视频参数 |
| videoParams.width | number | 是 | 视频宽度，最大支持1080p |
| videoParams.height | number | 是 | 视频高度，最大支持1080p |
| callbackUrl | string | 否 | 任务完成回调通知URL |

**请求示例**:

```json
{
  "templateVideoId": "30085e2d-b343-4b09-af25-a28430598230",
  "driveType": "TEXT",
  "text": "欢迎使用123数字人服务，简单便捷地创建您的专属视频内容。",
  "ttsParams": {
    "person": "20000000",
    "speed": "5",
    "volume": "5",
    "pitch": "5"
  },
  "videoParams": {
    "width": 720,
    "height": 1280
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
  "message": "提交123数字人合成任务成功",
  "data": 12345
}
```

### 2. 查询任务状态

**接口路径**: `POST /app-tools/digital-human/123-query`

**功能说明**: 查询123数字人视频合成任务状态

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
| data.historyResult[0].templateId | string | 底板ID |
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
    "historyAppId": 20,
    "historyStatus": "completed",
    "historyStartTime": "2023-01-01T12:00:00.000Z",
    "historyUseTime": 60000,
    "historyResult": [
      {
        "taskId": "vf3-abcd1234",
        "templateId": "1246",
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

## 123数字人拍摄指南

为了获得最佳的123数字人视频效果，请遵循以下拍摄指南：

1. **拍摄环境**
   - 选择光线充足、背景简单的场景
   - 避免背景杂乱或有移动物体
   - 确保录制环境安静，无明显背景噪音

2. **拍摄要求**
   - 对着镜头清晰说出"123"，持续约10秒钟
   - 拍摄时保持面部表情自然，避免过度表演
   - 确保面部在画面中居中且大小适中
   - 避免剧烈的头部运动

3. **技术规格**
   - 视频格式：MP4或MOV
   - 分辨率：建议720p以上，最高支持4K
   - 帧率：大于等于24fps
   - 时长：10秒至4分钟
   - 文件大小：不超过3GB
   - 色彩标准：SDR-Rec.709（非HDR）

4. **最佳实践**
   - 拍摄多个版本，选择效果最佳的上传
   - 尝试不同的表情和语调，以获得更丰富的底板素材
   - 使用三脚架确保画面稳定
   - 确保面部光线均匀，避免强烈阴影

## 使用流程

1. 按照拍摄指南录制10秒说"123"的视频，获取视频URL或上传至系统获取templateVideoId
2. 通过`voice-list`接口获取可用的发音人列表
3. 调用`123-start`接口提交视频合成任务，首次使用需提供templateVideoId，获取任务ID
4. 使用`123-query`接口查询任务状态，直到任务完成
5. 从任务查询结果中获取输出视频URL进行播放或下载
6. 后续再次使用时，可以直接使用返回的templateId而无需重新上传底板视频

## 底板重用

123数字人的一大特点是底板可以重复使用：

1. 首次使用时，通过templateVideoId参数提交底板视频
2. 系统会返回一个templateId，可以保存此ID
3. 后续合成视频时，只需使用templateId参数，无需再次上传底板视频
4. 使用相同底板生成不同内容的视频，保持一致的形象和风格

## 注意事项

1. 任务处理时间根据底板视频处理和文本长度而定，首次使用底板时耗时较长
2. 使用templateId重复使用底板时，视频合成速度会显著提升
3. 生成的视频文件保存期限为7天，请及时下载保存
4. 连续文本不应超过200字，超长文本应使用标点符号进行分割
5. 支持SSML标签，可以通过特定标记控制发音表达方式
6. 确保拍摄的底板视频符合平台规定的格式和内容要求 
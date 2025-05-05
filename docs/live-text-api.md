# 直播文本功能 API 接口文档

本文档描述了直播文本功能所提供的接口，包括文本润色、违禁词处理和自动文本生成功能。

## 接口基本信息

- 基础路径：`/app-tools/live-text`
- 所有接口需要 JWT 鉴权，请在请求头中添加 `Authorization: Bearer {token}`
- 所有接口的响应格式均为：
  ```json
  {
    "isSuccess": boolean, // 是否成功
    "message": string,    // 提示信息
    "data": any           // 返回数据
  }
  ```

## 接口列表

### 1. 文本润色

对文本进行智能润色，提升表达质量。

- **URL**: `/app-tools/live-text/polish`
- **方法**: `POST`
- **请求参数**:

```json
{
  "text": string,     // 原始文本内容（必填）
  "prompt": string,   // 润色提示词，指导润色方向（必填）
  "historyId": number // 历史记录ID（选填），提供此参数时会更新该历史记录而非创建新记录
}
```

- **返回示例**:

```json
{
  "isSuccess": true,
  "message": "文本润色成功",
  "data": {
    "polishedText": "润色后的文本内容",
    "foundForbiddenWords": [],  // 发现的违禁词列表，如有
    "pointsUsed": 1             // 消耗的点数
  }
}
```

- **说明**:
  - 计费规则：每100字消耗1点，最低1点
  - 会自动检测并处理文本中的违禁词
  - 当提供historyId参数时，会更新该历史记录而不是创建新记录
  - 如果指定的historyId不存在或不属于当前用户，将创建新的历史记录

### 2. 违禁词处理

自动检测并处理文本中的违禁词，生成合规文本。

- **URL**: `/app-tools/live-text/clean`
- **方法**: `POST`
- **请求参数**:

```json
{
  "text": string,     // 原始文本内容（必填）
  "prompt": string,   // 处理提示词，指导替换方向（选填）
  "historyId": number // 历史记录ID（选填），提供此参数时会更新该历史记录而非创建新记录
}
```

- **返回示例**:

```json
{
  "isSuccess": true,
  "message": "违禁词处理成功",
  "data": {
    "cleanedText": "处理后的文本内容",
    "foundForbiddenWords": ["最好", "最佳"],  // 发现的违禁词列表
    "remainingForbiddenWords": [],           // 处理后仍存在的违禁词，如有
    "pointsUsed": 1                          // 消耗的点数
  }
}
```

- **说明**:
  - 计费规则：每发现一个违禁词消耗0.5点，最低1点
  - 如果文本中没有违禁词，不会消耗点数
  - 当提供historyId参数时，会更新该历史记录而不是创建新记录
  - 如果指定的historyId不存在或不属于当前用户，将创建新的历史记录

### 3. 检查违禁词

仅检查文本中是否包含违禁词，不进行处理。

- **URL**: `/app-tools/live-text/check`
- **方法**: `POST`
- **请求参数**:

```json
{
  "text": string   // 要检查的文本内容（必填）
}
```

- **返回示例**:

```json
{
  "isSuccess": true,
  "message": "发现2个违禁词",
  "data": {
    "foundForbiddenWords": ["最好", "最佳"]  // 发现的违禁词列表
  }
}
```

- **说明**:
  - 此接口不消耗点数
  - 仅用于前端违禁词预检查

### 4. 生成文本

根据指定参数智能生成文本内容，支持多种场景。

- **URL**: `/app-tools/live-text/generate`
- **方法**: `POST`
- **请求参数**:

根据不同类型，请求参数有所不同：

#### 4.1 讲解音或场控文字生成

```json
{
  "type": "explain" | "control",  // explain: 讲解音, control: 场控文字
  "style": string,                // 生成风格，如"热情的"、"专业的"等
  "wordCount": number,            // 每条话术的字数要求
  "background": string,           // 背景知识或产品信息
  "suggestion": string,           // 生成建议（选填）
  "categories": [                 // 分类要求
    {
      "name": string,             // 分类名称
      "count": number             // 该分类需要生成的条数
    }
    // 可以有多个分类
  ],
  "historyId": number             // 历史记录ID（选填），提供此参数时会更新该历史记录而非创建新记录
}
```

#### 4.2 问答生成

```json
{
  "type": "qa",                   // 问答生成
  "style": string,                // 生成风格，如"热情的"、"专业的"等
  "wordCount": number,            // 每条回答的字数要求
  "background": string,           // 背景知识或产品信息
  "suggestion": string,           // 生成建议（选填）
  "count": number,                // 需要生成的问答对数量
  "requirements": string[],       // 问答的具体要求列表
  "historyId": number             // 历史记录ID（选填），提供此参数时会更新该历史记录而非创建新记录
}
```

- **返回示例**:

```json
{
  "isSuccess": true,
  "message": "文本生成成功",
  "data": {
    "scripts": [
      // 对于讲解音或场控文字，返回格式为：
      [
        { "text": "欢迎来到直播间", "generateAudio": true }
      ],
      // 对于问答生成，返回格式为：
      [
        { "text": "产品优势 价格合理 质量可靠 售后无忧 用途广泛", "generateAudio": false },
        { "text": "我们的产品具有多种优势：首先，价格非常合理...", "generateAudio": true }
      ]
      // 可能有多组内容
    ],
    "containsForbiddenWords": false,   // 是否包含违禁词
    "forbiddenWordsFound": null,       // 发现的违禁词详情，如有
    "pointsUsed": 5                    // 消耗的点数
  }
}
```

- **说明**:
  - 计费规则：
    - 问答类型：每个问答对2点
    - 讲解或场控类型：每条话术1点
    - 字数超过100的话术会增加50%的点数
    - 最低1点起步
  - 当提供historyId参数时，会更新该历史记录而不是创建新记录
  - 如果指定的historyId不存在或不属于当前用户，将创建新的历史记录

### 5. 获取任务历史记录

查询指定任务ID的历史记录详情。

- **URL**: `/app-tools/live-text/history`
- **方法**: `POST`
- **请求参数**:

```json
{
  "taskId": number   // 任务ID（必填）
}
```

- **返回示例**:

```json
{
  "isSuccess": true,
  "message": "获取历史记录成功",
  "data": {
    "historyId": 12345,
    "historyUserId": 67890,
    "historyAppId": 26,
    "historyStatus": "completed",
    "historyStartTime": "2023-06-01T12:34:56.000Z",
    "historyUseTime": 1234,
    "historyUsePoints": 5,
    "historyResult": [
      // 根据任务类型不同，内容也不同
    ],
    "historyErrorInfos": []
  }
}
```

- **说明**:
  - 只能查询自己的任务历史记录
  - 此接口不消耗点数

## 更新历史记录而非创建新记录

本系统支持在进行文本润色、违禁词处理和生成文本操作时，更新现有的历史记录而不是创建新记录。这在用户需要对同一内容进行多次编辑时特别有用。

使用方式：
1. 在调用相关接口时，提供可选参数 `historyId`，指定要更新的历史记录ID
2. 系统会检查该ID是否存在且属于当前用户
3. 如果验证通过，则在现有记录上添加新的操作结果
4. 如果验证失败，则创建新的历史记录

这种机制确保了用户可以方便地跟踪对同一内容的多次编辑历史，而不会产生大量重复的历史记录。

## 错误处理

所有接口在发生错误时，返回格式如下：

```json
{
  "isSuccess": false,
  "message": "错误信息描述",
  "data": null
}
```

常见错误类型：

- `余额不足`：用户点数不足以完成当前操作
- `服务器配额不足`：API服务器配额不足
- `返回的数据格式不正确`：生成的数据格式有误
- `无权查看此记录`：尝试查看其他用户的历史记录

## 违禁词说明

系统会自动检测并处理以下类别的违禁词：

- 极限词与夸大宣传词
- 虚假承诺与绝对化用词
- 品牌相关禁忌词
- 价格与促销相关禁忌词
- 医疗保健相关禁忌词
- 迷信相关禁忌词
- 不文明用语及歧视性语言
- 涉及政治敏感、违法违规词汇
- 诱导性词语
- 其他平台相关词汇
- 材质虚假描述词
- 疑似欺骗用户的词语 
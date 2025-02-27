# Coze API 文档

## WebSocket 接口

### 基本信息

- **接口URL**: `ws://localhost:3019/app-tools/coze?token=your_jwt_token`
- **协议**: WebSocket
- **描述**: 用于与Coze AI进行实时对话的WebSocket接口
- **认证**: 需要在URL中提供JWT Token（不需要Bearer前缀）

### 认证方式

WebSocket连接需要通过URL参数提供JWT Token进行认证：
```javascript
const token = 'your_jwt_token'; // 从登录接口获取的JWT Token（不需要Bearer前缀）
const ws = new WebSocket(`ws://localhost:3019/app-tools/coze?token=${token}`);
```

### 请求格式

```json
{
    "bot_id": "string",    // Coze机器人ID
    "message": "string",   // 用户发送的消息
    "newConversation": "boolean", // 可选，是否开始新对话，默认false
    "additional_messages": [  // 可选，上下文消息
        {
            "role": "user" | "assistant",  // 消息角色
            "content": "string",           // 消息内容
            "content_type": "text"         // 消息类型
        }
    ]
}
```

### 对话管理

1. **对话连续性**
   - 默认情况下，同一个WebSocket连接中的所有消息属于同一个对话
   - 对话历史会自动保存和关联
   - 断开连接时会自动完成当前对话

2. **开始新对话**
   - 设置 `newConversation: true` 来开始新对话
   - 这会结束当前对话并创建新的历史记录
   - 例如：
   ```json
   {
       "bot_id": "your_bot_id",
       "message": "你好",
       "newConversation": true
   }
   ```

### 响应事件类型

1. **对话创建事件** (CONVERSATION_CHAT_CREATED)
```json
{
    "event": "CONVERSATION_CHAT_CREATED",
    "data": {
        "conversation_id": "string",  // 对话ID
        "id": "string",              // 消息ID
        "historyId": "number"        // 历史记录ID（如果请求中未提供，则会创建新的）
    }
}
```

2. **增量消息事件** (CONVERSATION_MESSAGE_DELTA)
```json
{
    "event": "CONVERSATION_MESSAGE_DELTA",
    "data": {
        "content": "string"  // 消息内容片段
    }
}
```

3. **消息完成事件** (CONVERSATION_MESSAGE_COMPLETED)
```json
{
    "event": "CONVERSATION_MESSAGE_COMPLETED",
    "data": {
        "role": "assistant",
        "type": "answer",
        "content": "string"  // 完整消息内容
    }
}
```

4. **对话完成事件** (CONVERSATION_CHAT_COMPLETED)
```json
{
    "event": "CONVERSATION_CHAT_COMPLETED",
    "data": {
        "usage": {
            // 使用统计信息
        }
    }
}
```

5. **错误事件** (ERROR)
```json
{
    "event": "ERROR",
    "data": {
        "message": "string"  // 错误信息
    }
}
```

## HTTP 接口

### 删除历史记录

- **URL**: `/app-tools/coze/delete`
- **方法**: POST
- **描述**: 删除指定的对话历史记录
- **需要认证**: 是 (JWT Token)

#### 请求参数

```json
{
    "historyId": "number"  // 要删除的历史记录ID
}
```

#### 响应格式

成功响应：
```json
{
    "success": true,
    "message": "历史记录删除成功"
}
```

错误响应：
```json
{
    "success": false,
    "message": "错误信息",
    "error": "详细错误信息"
}
```

### Apifox 测试指南

1. **创建WebSocket请求**
   - 新建 -> WebSocket
   - 输入URL: `ws://localhost:3019/app-tools/coze?token=your_jwt_token`

2. **发送消息示例**
```json
{
    "bot_id": "your_bot_id",
    "message": "你好",
    "additional_messages": []
}
```

3. **测试步骤**
   1. 点击"连接"按钮
   2. 在"消息"面板中选择"发送消息"
   3. 选择消息类型为"Text"
   4. 输入消息内容
   5. 点击"发送"

### 注意事项

1. **环境要求**
   - 确保后端服务已启动 (`npm run start:dev`)
   - 确保`.env`中已配置`COZE_API_TOKEN`
   - 确保提供正确的`bot_id`

2. **认证要求**
   - 必须在WebSocket连接URL中提供有效的JWT Token
   - Token无效或过期会导致连接被拒绝
   - Token可以从登录接口获取

3. **错误处理**
   - 连接错误：检查服务是否启动及端口是否正确
   - 认证错误：检查JWT Token是否有效
   - 消息格式错误：检查发送的消息格式是否符合要求

4. **WebSocket状态**
   - 连接成功：控制台显示"Client connected"
   - 认证失败：连接会被立即关闭
   - 断开连接：控制台显示"Client disconnected"

5. **历史记录管理**
   - 每个对话会自动创建历史记录
   - 可以通过提供historyId继续之前的对话
   - 可以通过HTTP接口删除历史记录

### 示例代码

**uni-app 客户端示例**
```javascript
// 建立连接（需要提供token，不需要Bearer前缀）
const token = 'your_jwt_token'; // 从登录接口获取的JWT Token
const ws = uni.connectSocket({
    url: `ws://localhost:3019/app-tools/coze?token=${token}`,
    success: () => {
        console.log('连接成功');
    }
});

// 发送消息（继续当前对话）
function sendMessage(message) {
    ws.send({
        data: JSON.stringify({
            bot_id: 'your_bot_id',
            message: message
        })
    });
}

// 开始新对话
function startNewConversation(message) {
    ws.send({
        data: JSON.stringify({
            bot_id: 'your_bot_id',
            message: message,
            newConversation: true
        })
    });
}

// 监听消息
ws.onMessage((res) => {
    const data = JSON.parse(res.data);
    switch(data.event) {
        case 'CONVERSATION_CHAT_CREATED':
            console.log('对话创建，历史记录ID:', data.data.historyId);
            break;
        case 'CONVERSATION_MESSAGE_DELTA':
            console.log('收到增量消息:', data.data.content);
            break;
        case 'ERROR':
            console.error('错误:', data.data.message);
            break;
        // ... 处理其他事件
    }
});

// 监听错误
ws.onError((error) => {
    console.error('WebSocket错误:', error);
});

// 监听连接关闭
ws.onClose(() => {
    console.log('WebSocket已关闭');
});

// 删除历史记录示例
async function deleteHistory(historyId) {
    try {
        const response = await uni.request({
            url: 'http://localhost:3019/app-tools/coze/delete',
            method: 'POST',
            data: { historyId },
            header: {
                'Authorization': 'Bearer your_jwt_token'
            }
        });
        
        if (response.data.success) {
            console.log('历史记录删除成功');
        } else {
            console.error('删除失败:', response.data.message);
        }
    } catch (error) {
        console.error('请求错误:', error);
    }
}
``` 
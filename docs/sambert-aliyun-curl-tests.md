# Sambert语音合成API的CURL测试示例

以下是针对Sambert语音合成API的CURL测试命令，可用于测试各个接口功能。

## 1. 获取公开语音列表（无需登录）

```bash
curl -X GET "https://so-back.clouddreamai.com/app-tools/sambert-aliyun/public-voice-list" \
  -H "Content-Type: application/json"
```

## 2. 获取语音列表（需要登录）

```bash
curl -X GET "https://so-back.clouddreamai.com/app-tools/sambert-aliyun/voice-list" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 3. 提交语音合成任务

```bash
curl -X POST "https://so-back.clouddreamai.com/app-tools/sambert-aliyun/start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是一个Sambert语音合成的测试文本，用于演示API的功能。",
    "voice": "sambert-zhichu-v1",
    "format": "mp3",
    "sample_rate": 16000,
    "volume": 50,
    "rate": 1,
    "pitch": 1,
    "word_timestamp_enabled": false,
    "phoneme_timestamp_enabled": false
  }'
```

## 4. 批量提交语音合成任务

```bash
curl -X POST "https://so-back.clouddreamai.com/app-tools/sambert-aliyun/batch-start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "text": "第一条测试文本，使用知厨音色。",
        "voice": "sambert-zhichu-v1",
        "format": "mp3"
      },
      {
        "text": "第二条测试文本，使用其他音色并调整语速。",
        "voice": "sambert-zhinan-v1",
        "format": "wav",
        "rate": 1.2
      },
      {
        "text": "第三条测试文本，使用默认配置。"
      }
    ]
  }'
```

## 5. 查询任务状态

```bash
curl -X POST "https://so-back.clouddreamai.com/app-tools/sambert-aliyun/query" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 12345
  }'
```

## 测试脚本

下面是一个完整的测试脚本，可以依次测试所有API功能：

```bash
#!/bin/bash

# 设置变量
API_BASE="https://so-back.clouddreamai.com/app-tools/sambert-aliyun"
TOKEN="YOUR_JWT_TOKEN"

# 1. 测试公开语音列表
echo "===== 测试公开语音列表 ====="
curl -X GET "$API_BASE/public-voice-list" \
  -H "Content-Type: application/json"
echo -e "\n"

# 2. 测试获取所有语音列表（需要登录）
echo "===== 测试获取所有语音列表 ====="
curl -X GET "$API_BASE/voice-list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo -e "\n"

# 3. 提交单个语音合成任务
echo "===== 提交单个语音合成任务 ====="
TASK_ID=$(curl -X POST "$API_BASE/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是一个Sambert语音合成的测试文本，用于演示API的功能。",
    "voice": "sambert-zhichu-v1",
    "format": "mp3"
  }' | grep -o '"data":[0-9]*' | cut -d':' -f2)
echo "获取到任务ID: $TASK_ID"
echo -e "\n"

# 4. 查询任务状态
if [ ! -z "$TASK_ID" ]; then
  echo "===== 查询任务状态 ====="
  curl -X POST "$API_BASE/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"taskId\": $TASK_ID
    }"
  echo -e "\n"
fi

# 5. 提交批量语音合成任务
echo "===== 提交批量语音合成任务 ====="
BATCH_TASK_ID=$(curl -X POST "$API_BASE/batch-start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "text": "第一条测试文本，使用知厨音色。",
        "voice": "sambert-zhichu-v1",
        "format": "mp3"
      },
      {
        "text": "第二条测试文本，使用其他音色并调整语速。",
        "voice": "sambert-zhinan-v1",
        "format": "wav",
        "rate": 1.2
      }
    ]
  }' | grep -o '"data":[0-9]*' | cut -d':' -f2)
echo "获取到批量任务ID: $BATCH_TASK_ID"
echo -e "\n"

# 6. 查询批量任务状态
if [ ! -z "$BATCH_TASK_ID" ]; then
  echo "===== 查询批量任务状态 ====="
  curl -X POST "$API_BASE/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"taskId\": $BATCH_TASK_ID
    }"
  echo -e "\n"
fi
```

使用方法：
1. 将上述代码保存为`test_sambert_api.sh`
2. 修改`TOKEN`变量为你的JWT令牌
3. 给脚本添加执行权限：`chmod +x test_sambert_api.sh`
4. 运行脚本：`./test_sambert_api.sh` 
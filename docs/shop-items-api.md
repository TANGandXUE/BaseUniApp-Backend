# 商品信息 API 文档

本文档详细说明了商品信息的增删改查 API 接口，供前端开发人员参考。

## 数据模型

### ShopItems 商品实体

```typescript
{
    "shopItemId": number,            // 商品ID (自动生成)
    "shopItemName": string,          // 商品名称
    "shopItemPrice": number,         // 商品价格
    "shopItemDescription": [         // 商品描述（包含优点和弊端）
        {
            "type": "pros" | "cons", // 描述类型：优点或弊端
            "text": string           // 描述内容
        },
        // 可有多个描述项...
    ],
    "shopItemContent": [             // 商品包含的权益内容
        {
            "type": string,          // 权益类型，例如: "points", "vip", "function"
            "value": string,         // 权益值，例如积分数量、会员等级、功能标识
            "expirationTime": number // 过期时间(毫秒)，-1表示永不过期
        },
        // 可有多个内容项...
    ],
    "shopItemImageUrl": string,      // 商品图片URL
    "shopItemType": string,          // 商品类型，只能是 "点卡" 或 "会员"
    "shopItemStatus": number,        // 商品状态，0-下架，1-上架
    "shopItemCreateTime": Date,      // 商品创建时间 (自动生成)
    "shopItemUpdateTime": Date,      // 商品更新时间 (自动生成)
    "shopItemStock": number          // 商品库存，-1表示无限
}
```

## API 接口

所有接口都需要 JWT 认证（需要在请求头中包含有效的 Authorization 令牌）。

### 1. 添加商品

**接口描述**：创建一个新的商品项

**请求方式**：POST

**接口路径**：`/sql/shop/add-shop-item`

**请求参数**：

```typescript
{
    "shopItemName": string,          // 必填，商品名称
    "shopItemPrice": number,         // 必填，商品价格
    "shopItemDescription": [         // 必填，商品描述
        {
            "type": "pros" | "cons", // 描述类型
            "text": string           // 描述内容
        },
        // ...
    ],
    "shopItemContent": [             // 必填，商品内容
        {
            "type": string,          // 权益类型
            "value": string,         // 权益值
            "expirationTime": number // 过期时间
        },
        // ...
    ],
    "shopItemImageUrl": string,      // 商品图片URL
    "shopItemType": string,          // 必填，商品类型 ("点卡" 或 "会员")
    "shopItemStatus": number,        // 必填，商品状态 (0-下架，1-上架)
    "shopItemStock": number          // 必填，商品库存 (-1表示无限)
}
```

**响应结果**：

```typescript
{
    "success": boolean,              // 操作是否成功
    "message": string,               // 操作结果描述
    "data": {
        // 返回创建的商品完整信息，包含自动生成的ID和时间戳
        ...ShopItems
    }
}
```

**示例**：

```typescript
// 请求示例
{
    "shopItemName": "尝鲜包",
    "shopItemPrice": 1.9,
    "shopItemDescription": [
        {
            "type": "pros",
            "text": "立刻获得100点积分"
        },
        {
            "type": "pros",
            "text": "立刻获得3天高级会员"
        },
        {
            "type": "cons",
            "text": "免费服务器，速度较慢"
        }
    ],
    "shopItemContent": [
        {
            "type": "points",
            "value": "100",
            "expirationTime": -1
        },
        {
            "type": "vip",
            "value": "2",
            "expirationTime": 259200000
        },
        {
            "type": "function",
            "value": "downloadResults",
            "expirationTime": -1
        }
    ],
    "shopItemImageUrl": "https://example.com/image.jpg",
    "shopItemType": "点卡",
    "shopItemStatus": 1,
    "shopItemStock": -1
}
```

### 2. 获取单个商品信息

**接口描述**：根据商品ID获取单个商品的详细信息

**请求方式**：GET

**接口路径**：`/sql/shop/get-single-shop-item`

**请求参数**：

| 参数名 | 参数类型 | 是否必须 | 说明 |
|--------|---------|---------|------|
| shopItemId | number | 是 | 商品ID |

**响应结果**：

```typescript
{
    "success": boolean,              // 操作是否成功
    "message": string,               // 操作结果描述
    "data": {
        // 返回商品完整信息
        ...ShopItems
    }
}
```

### 3. 获取所有商品信息

**接口描述**：获取所有商品的列表

**请求方式**：GET

**接口路径**：`/sql/shop/get-all-shop-items`

**请求参数**：无

**响应结果**：

```typescript
{
    "success": boolean,              // 操作是否成功
    "message": string,               // 操作结果描述
    "data": [
        // 返回商品完整信息数组
        {...ShopItems},
        {...ShopItems},
        // ...
    ]
}
```

### 4. 更新商品信息

**接口描述**：更新指定商品的信息

**请求方式**：POST

**接口路径**：`/sql/shop/update-shop-item`

**请求参数**：

```typescript
{
    "shopItemId": number,            // 必填，要更新的商品ID
    "updateData": {
        // 以下字段为可选，只更新提供的字段
        "shopItemName"?: string,
        "shopItemPrice"?: number,
        "shopItemDescription"?: Array<{
            "type": "pros" | "cons",
            "text": string
        }>,
        "shopItemContent"?: Array<{
            "type": string,
            "value": string,
            "expirationTime": number
        }>,
        "shopItemImageUrl"?: string,
        "shopItemType"?: string,      // "点卡" 或 "会员"
        "shopItemStatus"?: number,    // 0-下架，1-上架
        "shopItemStock"?: number      // 库存数量，-1表示无限
    }
}
```

**响应结果**：

```typescript
{
    "success": boolean,              // 操作是否成功
    "message": string,               // 操作结果描述
    "data": {
        // 返回更新后的商品完整信息
        ...ShopItems
    }
}
```

### 5. 删除商品

**接口描述**：删除指定的商品

**请求方式**：POST

**接口路径**：`/sql/shop/delete-shop-item`

**请求参数**：

```typescript
{
    "shopItemId": number             // 必填，要删除的商品ID
}
```

**响应结果**：

```typescript
{
    "success": boolean,              // 操作是否成功
    "message": string,               // 操作结果描述
    "data": {
        // 可能包含删除结果的信息
    }
}
```

## 常见错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（JWT token无效） |
| 404 | 商品不存在 |
| 500 | 服务器内部错误 |

## 商品内容类型说明

商品内容项(`shopItemContent`)支持以下类型:

1. **积分类型** (`type: "points"`)
   - `value`: 积分数量
   - `expirationTime`: 积分过期时间，-1表示永不过期

2. **会员类型** (`type: "vip"`)
   - `value`: 会员等级，例如 "1", "2" 等
   - `expirationTime`: 会员有效期，单位为毫秒，例如 259200000 表示3天

3. **功能类型** (`type: "function"`)
   - `value`: 功能标识，例如 "downloadResults", "digitalHuman" 等
   - `expirationTime`: 功能有效期，-1表示永久有效

## 示例场景

### 示例1: 创建一个尝鲜包商品

**请求**:
```http
POST /sql/shop/add-shop-item
Authorization: Bearer [JWT_TOKEN]
Content-Type: application/json

{
    "shopItemName": "尝鲜包",
    "shopItemPrice": 1.9,
    "shopItemDescription": [
        {
            "type": "pros",
            "text": "立刻获得100点积分"
        },
        {
            "type": "pros",
            "text": "立刻获得3天高级会员"
        },
        {
            "type": "cons",
            "text": "免费服务器，速度较慢"
        }
    ],
    "shopItemContent": [
        {
            "type": "points",
            "value": "100",
            "expirationTime": -1
        },
        {
            "type": "vip",
            "value": "2",
            "expirationTime": 259200000
        }
    ],
    "shopItemImageUrl": "",
    "shopItemType": "点卡",
    "shopItemStatus": 1,
    "shopItemStock": -1
}
```

**响应**:
```json
{
    "success": true,
    "message": "商品添加成功",
    "data": {
        "shopItemId": 1,
        "shopItemName": "尝鲜包",
        "shopItemPrice": 1.9,
        "shopItemDescription": [
            {
                "type": "pros",
                "text": "立刻获得100点积分"
            },
            {
                "type": "pros",
                "text": "立刻获得3天高级会员"
            },
            {
                "type": "cons",
                "text": "免费服务器，速度较慢"
            }
        ],
        "shopItemContent": [
            {
                "type": "points",
                "value": "100",
                "expirationTime": -1
            },
            {
                "type": "vip",
                "value": "2",
                "expirationTime": 259200000
            }
        ],
        "shopItemImageUrl": "",
        "shopItemType": "点卡",
        "shopItemStatus": 1,
        "shopItemStock": -1,
        "shopItemCreateTime": "2023-08-01T12:00:00.000Z",
        "shopItemUpdateTime": "2023-08-01T12:00:00.000Z"
    }
}
``` 
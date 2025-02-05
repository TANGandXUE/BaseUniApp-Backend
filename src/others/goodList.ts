// 根据用户选择的商品，返回对应的参数
export function getGoodList(goodName: string) {

    switch (goodName) {
        case '尝鲜包':
            return {
                "goodName": "尝鲜包",
                "goodPrice": 9.9,
                "goodAddPoints": 1000,
                "goodAddExpireDate": 0,
                "goodAddLevel": 1,
            }
        case '畅享包':
            return {
                "goodName": "畅享包",
                "goodPrice": 0.25,
                "goodAddPoints": 5000,
                "goodAddExpireDate": 0,
                "goodAddLevel": 1,
            }
        case '轻享版':
            return {
                "goodName": "轻享版",
                "goodPrice": 0.3,
                "goodAddPoints": 1000,
                "goodAddExpireDate": 30,
                "goodAddLevel": 2,
            }
        case '专业版':
            return {
                "goodName": "专业版",
                "goodPrice": 0.45,
                "goodAddPoints": 10000,
                "goodAddExpireDate": 30,
                "goodAddLevel": 2,
            }
        case '团队版':
            return {
                "goodName": "团队版",
                "goodPrice": 0.55,
                "goodAddPoints": 50000,
                "goodAddExpireDate": 30,
                "goodAddLevel": 2,
            }
        default:
            return {
                "goodName": "未知",
                "goodPrice": 0,
                "goodAddPoints": 0,
                "goodAddExpireDate": 0,
                "goodAddLevel": 0,
            }
    }

}
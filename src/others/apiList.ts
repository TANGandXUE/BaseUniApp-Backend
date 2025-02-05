// 根据不同的用户等级，返回其等级下所能使用的所有API列表
export function getApiList(userLevel: number) {

    switch (userLevel) {
        case 0:
            return [
                "meituauto"
            ]
        case 1:
            return [
                "meituauto"
            ]
        default:
            return [
                "meituauto"
            ]
    }

}
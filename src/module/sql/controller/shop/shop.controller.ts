import { Controller, Get, Post, Body } from '@nestjs/common';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { ShopItems } from 'src/entities/shopItems.entity';


@Controller('sql/shop')
export class ShopController {
    constructor(private readonly sqlService: SqlService) { }

    // 添加商品
    @Post('add-shop-item')
    async addShopItem(@Body() shopItem: ShopItems) {
        return await this.sqlService.addShopItem(shopItem);
    }

    // 获取所有商品信息
    @Get('get-all-shop-items')

    async getAllShopItems() {
        return await this.sqlService.getShopItems();
    }

    // 更新商品信息
    @Post('update-shop-item')
    async updateShopItem(@Body() shopItem: ShopItems) {
        return await this.sqlService.updateShopItem(Number(shopItem.shopItemId), shopItem);
    }

    // 删除商品
    @Post('delete-shop-item')
    async deleteShopItem(@Body() shopItemId: number) {
        return await this.sqlService.deleteShopItem(Number(shopItemId));
    }


}
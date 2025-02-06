import { Controller, Get, Post, Body, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { SqlService } from 'src/module/sql/service/sql/sql.service';
import { ShopItems } from 'src/entities/shopItems.entity';
import { JwtAuthGuard } from 'src/module/user/others/jwt-auth.guard';


@Controller('sql/shop')
export class ShopController {
    constructor(private readonly sqlService: SqlService) { }

    // 添加商品
    @Post('add-shop-item')
    @UseGuards(JwtAuthGuard)
    async addShopItem(@Body() shopItem: ShopItems) {
        return await this.sqlService.addShopItem(shopItem);
    }

    // 获取单个商品信息
    @Get('get-single-shop-item')
    @UseGuards(JwtAuthGuard)
    async getSingleShopItem(@Query('shopItemId') shopItemId: number) {
        return await this.sqlService.getSingleShopItem(Number(shopItemId));
    }

    // 获取所有商品信息
    @Get('get-all-shop-items')
    @UseGuards(JwtAuthGuard)
    async getAllShopItems() {
        return await this.sqlService.getShopItems();
    }

    // 更新商品信息（简化控制器逻辑）
    @Post('update-shop-item')
    @UseGuards(JwtAuthGuard)
    async updateShopItem(
        @Body() body: { shopItemId: number; updateData: Partial<ShopItems> }
    ) {
        return await this.sqlService.updateShopItem(
            body.shopItemId,
            body.updateData
        );
    }

    // 删除商品
    @Post('delete-shop-item')
    @UseGuards(JwtAuthGuard)
    async deleteShopItem(@Body() body: { shopItemId: string | number }) {
        const id = Number(body.shopItemId);
        if (isNaN(id)) {
            throw new BadRequestException('商品ID必须是有效数字');
        }
        return await this.sqlService.deleteShopItem(id);
    }



}
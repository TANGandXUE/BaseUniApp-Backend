import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// 定义商品描述类型
export interface ShopItemDescriptionItem {
    type: 'pros' | 'cons';  // 优点或弊端
    text: string;
}

// 定义商品内容类型
export interface ShopItemContent {
    type: string;  // 'points'、'vip'、'function' 等
    value: string;  // 对应具体的值，如积分数量、会员等级、功能标识等
    expirationTime: number;  // 过期时间，-1表示永不过期，其他为毫秒数
}

@Entity()
export class ShopItems {

    //商品ID
    @PrimaryGeneratedColumn()
    shopItemId: number;

    //商品名称
    @Column({ type: "varchar" })
    shopItemName: string;

    //商品价格
    @Column({ type: "float" })
    shopItemPrice: number;

    //商品描述（包含优点和弊端）
    @Column({ type: "json" })
    shopItemDescription: ShopItemDescriptionItem[];

    //商品内容（包含积分、会员、功能等权益）
    @Column({ type: "json" })
    shopItemContent: ShopItemContent[];

    //商品图片URL
    @Column({ type: "varchar" })
    shopItemImageUrl: string;

    //商品类型 ( "点卡" | "会员" )
    @Column({ type: "varchar", comment: "只能是 '点卡' 或 '会员'" })
    shopItemType: string;

    //商品状态 ( 0: 下架, 1: 上架 )
    @Column({ type: "int", comment: "0-下架 1-上架" })
    shopItemStatus: number;

    //商品创建时间
    @CreateDateColumn({ type: "timestamp" })
    shopItemCreateTime: Date;

    //商品更新时间
    @UpdateDateColumn({ type: "timestamp" })
    shopItemUpdateTime: Date;

    //商品库存（-1为无限）
    @Column({ type: "int", comment: "库存数量，-1表示无限" })
    shopItemStock: number;

}
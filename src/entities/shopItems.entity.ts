import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// 定义商品内容类型
export interface ShopItemContent {
    type: string;
    value: number;
    expirationTime: number;
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

    //商品描述
    @Column({ type: "json" })
    shopItemDescription: object[];

    //商品内容
    @Column({ type: "json" })
    shopItemContent: ShopItemContent[];  // 使用具体类型替代object[]

    //商品图片URL
    @Column({ type: "varchar" })
    shopItemImageUrl: string;

    //商品类型 ( "点卡" | "会员" )
    @Column({ type: "varchar" })
    shopItemType: string;

    //商品状态 ( 0: 下架, 1: 上架 )
    @Column({ type: "int" })
    shopItemStatus: number;

    //商品创建时间
    @CreateDateColumn({ type: "timestamp" })
    shopItemCreateTime: Date;

    //商品更新时间
    @UpdateDateColumn({ type: "timestamp" })
    shopItemUpdateTime: Date;

    //商品库存（-1为无限）
    @Column({ type: "int" })
    shopItemStock: number;

}
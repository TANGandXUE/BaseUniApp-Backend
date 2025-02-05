import { Entity, Column, CreateDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ShopItems {

    //商品ID
    @PrimaryColumn()
    shopItemId: string;

    //商品名称
    @Column({ type: "varchar" })
    shopItemName: string;

    //商品价格
    @Column({ type: "float" })
    shopItemPrice: number;

    //商品描述
    @Column({ type: "json" })
    shopItemDescription: object;

    //商品内容
    @Column({ type: "json" })
    shopItemContent: object;

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

    //商品库存
    @Column({ type: "int" })
    shopItemStock: number;

}
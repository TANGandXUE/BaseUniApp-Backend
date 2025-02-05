import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ParamsInfo {

    // 临时参数列表对应的工作Id
    @PrimaryColumn({ type: "varchar" })
    paramsWorkId: string;

    // 临时参数列表
    @Column('json')
    params: object;

}
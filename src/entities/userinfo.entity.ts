import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class UserInfo {

  //用户id
  @PrimaryGeneratedColumn()
  userId: number;

  //用户名
  @Column({ type: "varchar" })
  userName: string;

  //用户密码
  @Column({ type: "varchar" })
  userPassword: string;

  //用户积分
  @Column({ type: "int" })
  userPoints: number;

  //用户注册手机号
  @Column({ type: "varchar" })
  userPhone: string;

  //用户注册邮箱
  @Column({ type: "varchar" })
  userEmail: string;

  //用户状态
  @Column({ type: "varchar" })
  userStatus: string;

  //用户会员等级
  @Column({ type: "int" })
  userLevel: number;

  //用户会员到期时间
  @CreateDateColumn({ type: "timestamp" })
  userExpireDate: Date;

  //用户已用积分
  @Column({ type: "int" })
  userUsedPoints: number;

  //用户注册时间
  @CreateDateColumn({ type: "timestamp" })
  userRegisterDate: Date;

  //用户头像URL
  @Column({ type: "varchar" })
  userAvatarUrl: string;

  //用户是否是管理员
  @Column({ type: "boolean" })
  userIsAdmin: boolean;
}

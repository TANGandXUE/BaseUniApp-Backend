import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class UserUpload {

  @PrimaryGeneratedColumn()
  fileId: number;

  @Column({type:"int"})
  userId: number;

  @Column()
  fileName: string;

  @Column({type:"varchar"})
  filePath: string;

  @CreateDateColumn({type:"timestamp"})
  uploadDate: Date;
}
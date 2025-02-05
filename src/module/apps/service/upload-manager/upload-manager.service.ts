import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadInfo } from 'src/entities/uploadInfo.entity';

@Injectable()
export class UploadManagerService {
    constructor(
        @InjectRepository(UploadInfo)
        private uploadInfoRepository: Repository<UploadInfo>,
    ) { }


    // 上传与删除 ------------------------------------------------------------
    // 写入上传文件
    async writeUploadFile(uploadInfo: Partial<UploadInfo>) {
        try {
            return { isSuccess: true, message: '写入上传文件成功', data: await this.uploadInfoRepository.save(uploadInfo) };
        } catch (error) {
            return { isSuccess: false, message: '写入上传文件失败', data: error };
        }
    }
    // 删除上传文件
    async deleteUploadFile(uploadId: string, uploadUserId: number) {
        const uploadFile = await this.uploadInfoRepository.findOne({ where: { uploadId: Number(uploadId) } });
        if (uploadFile && uploadFile.uploadUserId === uploadUserId) {
            try {
                await this.uploadInfoRepository.delete(Number(uploadId));
                return { isSuccess: true, message: '删除上传文件成功', data: null };
            } catch (error) {
                return { isSuccess: false, message: '删除上传文件失败', data: error };
            }
        } else {
            return { isSuccess: false, message: '删除上传文件失败，文件所属用户与当前用户不匹配', data: null };
        }
    }


    // 获取文件 ----------------------------------------------------------------
    // 获取用户全部上传文件列表
    async getUploadFilesByUserId(userId: number) {
        try {
            return { isSuccess: true, message: '获取用户全部上传文件列表成功', data: await this.uploadInfoRepository.find({ where: { uploadUserId: userId } }) };
        } catch (error) {
            return { isSuccess: false, message: '获取用户全部上传文件列表失败', data: error };
        }
    }
    // 获取用户当前应用上传文件列表
    async getUploadFilesByUserIdAndAppId(userId: number, appId: number) {
        try {
            return { isSuccess: true, message: '获取用户当前应用上传文件列表成功', data: await this.uploadInfoRepository.find({ where: { uploadUserId: userId, uploadAppId: appId } }) };
        } catch (error) {
            return { isSuccess: false, message: '获取用户当前应用上传文件列表失败', data: error };
        }
    }
    // 获取用户当前应用下当前文件类别上传文件列表
    async getUploadFilesByUserIdAndAppIdAndCategory(userId: number, appId: number, category: string) {
        try {
            return { isSuccess: true, message: '获取用户当前应用下当前文件类别上传文件列表成功', data: await this.uploadInfoRepository.find({ where: { uploadUserId: userId, uploadAppId: appId, uploadCategory: category } }) };
        } catch (error) {
            return { isSuccess: false, message: '获取用户当前应用下当前文件类别上传文件列表失败', data: error };
        }
    }
    // 获取单个上传文件
    async getUploadFileById(uploadId: number, uploadUserId: number) {
        const uploadFile = await this.uploadInfoRepository.findOne({ where: { uploadId } });
        if (uploadFile && uploadFile.uploadUserId === uploadUserId) {
            return { isSuccess: true, message: '获取单个上传文件成功', data: uploadFile };
        } else {
            return { isSuccess: false, message: '获取单个上传文件失败，文件不存在或文件所属用户与当前用户不匹配', data: null };
        }
    }
}

/**
 * Upload Service Client
 * Integration helper for other services to interact with upload-service
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileType, FileUploadResponseDto } from '@blog/shared/dto';
import { UploadResult, PostServiceIntegration } from '../interfaces/upload.interface';

@Injectable()
export class UploadServiceClient {
  private readonly uploadServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.uploadServiceUrl = this.configService.get(
      'UPLOAD_SERVICE_URL',
      'http://localhost:3003'
    );
  }

  /**
   * Upload file via upload service
   */
  async uploadFile(
    file: any,
    type: FileType,
    metadata: PostServiceIntegration & {
      userId: string;
      userName?: string;
    },
    authToken: string
  ): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, file.originalname);
      formData.append('type', type);
      
      if (metadata.altText) formData.append('alt', metadata.altText);
      if (metadata.caption) formData.append('caption', metadata.caption);
      if (metadata.seoTitle) formData.append('seoTitle', metadata.seoTitle);
      if (metadata.seoDescription) formData.append('seoDescription', metadata.seoDescription);
      if (metadata.postId) formData.append('relatedPostId', metadata.postId);
      if (metadata.categoryId) formData.append('relatedCategoryId', metadata.categoryId);

      const response = await firstValueFrom(
        this.httpService.post(`${this.uploadServiceUrl}/uploads/single`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      const uploadData: FileUploadResponseDto = response.data.data;

      return {
        success: true,
        fileId: uploadData.id,
        urls: {
          original: uploadData.cloudinaryUrl,
          optimized: uploadData.cloudinarySecureUrl || uploadData.cloudinaryUrl,
          thumbnail: uploadData.responsiveUrls?.small || uploadData.cloudinaryUrl,
          responsive: {
            small: uploadData.responsiveUrls?.small || uploadData.cloudinaryUrl,
            medium: uploadData.responsiveUrls?.medium || uploadData.cloudinaryUrl,
            large: uploadData.responsiveUrls?.large || uploadData.cloudinaryUrl,
          },
        },
        metadata: {
          width: uploadData.width,
          height: uploadData.height,
          format: uploadData.format,
          size: uploadData.size,
          bytes: uploadData.bytes,
        },
      };

    } catch (error: any) {
      console.error('Upload service error:', error?.response?.data || error.message);
      
      return {
        success: false,
        error: {
          code: error?.response?.status || 500,
          message: error?.response?.data?.message || 'Upload failed',
          details: error?.response?.data || error.message,
        },
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: any[],
    type: FileType,
    metadata: PostServiceIntegration & {
      userId: string;
      userName?: string;
    },
    authToken: string
  ): Promise<UploadResult[]> {
    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file.buffer, file.originalname);
      });
      
      formData.append('type', type);
      
      if (metadata.altText) formData.append('alt', metadata.altText);
      if (metadata.caption) formData.append('caption', metadata.caption);
      if (metadata.postId) formData.append('relatedPostId', metadata.postId);
      if (metadata.categoryId) formData.append('relatedCategoryId', metadata.categoryId);

      const response = await firstValueFrom(
        this.httpService.post(`${this.uploadServiceUrl}/uploads/multiple`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      const uploadResults: FileUploadResponseDto[] = response.data.data;

      return uploadResults.map(uploadData => ({
        success: true,
        fileId: uploadData.id,
        urls: {
          original: uploadData.cloudinaryUrl,
          optimized: uploadData.cloudinarySecureUrl || uploadData.cloudinaryUrl,
          thumbnail: uploadData.responsiveUrls?.small || uploadData.cloudinaryUrl,
          responsive: {
            small: uploadData.responsiveUrls?.small || uploadData.cloudinaryUrl,
            medium: uploadData.responsiveUrls?.medium || uploadData.cloudinaryUrl,
            large: uploadData.responsiveUrls?.large || uploadData.cloudinaryUrl,
          },
        },
        metadata: {
          width: uploadData.width,
          height: uploadData.height,
          format: uploadData.format,
          size: uploadData.size,
          bytes: uploadData.bytes,
        },
      }));

    } catch (error: any) {
      console.error('Upload service error:', error?.response?.data || error.message);
      
      return [{
        success: false,
        error: {
          code: error?.response?.status || 500,
          message: error?.response?.data?.message || 'Upload failed',
          details: error?.response?.data || error.message,
        },
      }];
    }
  }

  /**
   * Get file info from upload service
   */
  async getFileInfo(fileId: string, authToken: string): Promise<FileUploadResponseDto | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.uploadServiceUrl}/uploads/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Get file info error:', error?.response?.data || error.message);
      return null;
    }
  }

  /**
   * Delete file from upload service
   */
  async deleteFile(fileId: string, authToken: string, reason?: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.uploadServiceUrl}/uploads/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          params: reason ? { reason } : {},
        })
      );

      return true;
    } catch (error: any) {
      console.error('Delete file error:', error?.response?.data || error.message);
      return false;
    }
  }

  /**
   * Track download for analytics
   */
  async trackDownload(fileId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.uploadServiceUrl}/uploads/${fileId}/download`, {})
      );
    } catch (error: any) {
      // Silently fail for analytics tracking
      console.warn('Track download warning:', error?.response?.data || error.message);
    }
  }
}
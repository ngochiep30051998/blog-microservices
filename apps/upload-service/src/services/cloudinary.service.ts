import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { FileType } from '@blog/shared/dto';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
}

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinaryInstance: typeof cloudinary
  ) {}

  /**
   * Upload file to Cloudinary based on file type
   */
  async uploadFile(file: any, type: FileType): Promise<CloudinaryUploadResult> {
    this.validateFile(file, type);

    const uploadOptions = this.getUploadOptions(type);

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload ${type}: ${error.message}`);
    }
  }

  /**
   * Upload thumbnail image (800x450, optimized for web)
   */
  async uploadThumbnail(file: any): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, FileType.THUMBNAIL);
  }

  /**
   * Upload featured image (1200x630, optimized for social sharing)
   */
  async uploadFeaturedImage(file: any): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, FileType.FEATURED);
  }

  /**
   * Upload content image (responsive, multiple sizes)
   */
  async uploadContentImage(file: any): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, FileType.CONTENT);
  }

  /**
   * Upload gallery image (optimized for gallery display)
   */
  async uploadGalleryImage(file: any): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, FileType.GALLERY);
  }

  /**
   * Upload document file
   */
  async uploadDocument(file: any): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, FileType.DOCUMENT);
  }

  /**
   * Upload video file
   */
  async uploadVideo(file: any): Promise<CloudinaryUploadResult> {
    this.validateVideoFile(file);

    const uploadOptions = {
      folder: 'blog/videos',
      public_id: `video_${Date.now()}`,
      resource_type: 'video' as const,
      chunk_size: 20000000, // 20MB chunks
      eager: [
        { width: 1280, height: 720, crop: 'limit', quality: 'auto:good', format: 'mp4' },
        { width: 854, height: 480, crop: 'limit', quality: 'auto:good', format: 'mp4' },
      ],
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Upload audio file
   */
  async uploadAudio(file: any): Promise<CloudinaryUploadResult> {
    this.validateAudioFile(file);

    const uploadOptions = {
      folder: 'blog/audio',
      public_id: `audio_${Date.now()}`,
      resource_type: 'video' as const, // Cloudinary uses 'video' for audio too
      chunk_size: 20000000, // 20MB chunks
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload audio: ${error.message}`);
    }
  }

  /**
   * Generate responsive URLs for different screen sizes
   */
  generateResponsiveUrls(publicId: string): {
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    const baseUrl = this.cloudinaryInstance.url(publicId);
    
    return {
      small: this.cloudinaryInstance.url(publicId, {
        width: 400,
        height: 300,
        crop: 'fill',
        format: 'webp',
        quality: 'auto:good'
      }),
      medium: this.cloudinaryInstance.url(publicId, {
        width: 800,
        height: 600,
        crop: 'fill',
        format: 'webp',
        quality: 'auto:good'
      }),
      large: this.cloudinaryInstance.url(publicId, {
        width: 1200,
        height: 900,
        crop: 'fill',
        format: 'webp',
        quality: 'auto:good'
      }),
      original: baseUrl
    };
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string, resourceType: string = 'image'): Promise<void> {
    try {
      await this.cloudinaryInstance.uploader.destroy(publicId, {
        resource_type: resourceType as any,
      });
    } catch (error: any) {
      console.warn(`Failed to delete file ${publicId}:`, error.message);
      // Don't throw error - file deletion is not critical
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(publicId: string, resourceType: string = 'image'): Promise<any> {
    try {
      return await this.cloudinaryInstance.api.resource(publicId, {
        resource_type: resourceType as any,
      });
    } catch (error: any) {
      throw new BadRequestException(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Generate signed upload URL for direct client uploads
   */
  generateSignedUploadUrl(type: FileType, publicId?: string): {
    url: string;
    signature: string;
    timestamp: number;
    apiKey: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = this.getFolderByType(type);
    
    const params: any = {
      timestamp,
      folder,
      quality: 'auto:good',
      format: 'auto'
    };

    if (publicId) {
      params.public_id = publicId;
    }

    const signature = this.cloudinaryInstance.utils.api_sign_request(
      params,
      this.cloudinaryInstance.config().api_secret || ''
    );

    return {
      url: `https://api.cloudinary.com/v1_1/${this.cloudinaryInstance.config().cloud_name}/auto/upload`,
      signature,
      timestamp,
      apiKey: this.cloudinaryInstance.config().api_key || '',
    };
  }

  /**
   * Get upload options based on file type
   */
  private getUploadOptions(type: FileType): any {
    const baseOptions = {
      overwrite: true,
      folder: this.getFolderByType(type),
      public_id: `${type}_${Date.now()}`,
    };

    switch (type) {
      case FileType.THUMBNAIL:
        return {
          ...baseOptions,
          transformation: [
            { width: 800, height: 450, crop: 'fill', gravity: 'center' },
            { quality: 'auto:good' },
            { format: 'webp' }
          ],
          resource_type: 'image' as const,
        };

      case FileType.FEATURED:
        return {
          ...baseOptions,
          transformation: [
            { width: 1200, height: 630, crop: 'fill', gravity: 'center' },
            { quality: 'auto:good' },
            { format: 'webp' }
          ],
          resource_type: 'image' as const,
        };

      case FileType.CONTENT:
        return {
          ...baseOptions,
          transformation: [
            { width: 1024, height: 1024, crop: 'limit' },
            { quality: 'auto:good' },
            { format: 'webp' }
          ],
          resource_type: 'image' as const,
        };

      case FileType.GALLERY:
        return {
          ...baseOptions,
          public_id: `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
            { format: 'webp' }
          ],
          resource_type: 'image' as const,
        };

      case FileType.DOCUMENT:
        return {
          ...baseOptions,
          resource_type: 'raw' as const,
        };

      case FileType.VIDEO:
        return {
          ...baseOptions,
          resource_type: 'video' as const,
          chunk_size: 20000000, // 20MB chunks
        };

      case FileType.AUDIO:
        return {
          ...baseOptions,
          resource_type: 'video' as const, // Cloudinary uses 'video' for audio
          chunk_size: 20000000, // 20MB chunks
        };

      default:
        return {
          ...baseOptions,
          resource_type: 'auto' as const,
        };
    }
  }

  /**
   * Get folder name based on file type
   */
  private getFolderByType(type: FileType): string {
    const folderMap = {
      [FileType.THUMBNAIL]: 'blog/thumbnails',
      [FileType.FEATURED]: 'blog/featured',
      [FileType.CONTENT]: 'blog/content',
      [FileType.GALLERY]: 'blog/gallery',
      [FileType.DOCUMENT]: 'blog/documents',
      [FileType.VIDEO]: 'blog/videos',
      [FileType.AUDIO]: 'blog/audio',
      [FileType.OTHER]: 'blog/other',
    };

    return folderMap[type] || 'blog/uploads';
  }

  /**
   * Validate uploaded file based on type
   */
  private validateFile(file: any, type: FileType): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size (different limits for different types)
    const maxSizes = {
      [FileType.THUMBNAIL]: 5 * 1024 * 1024, // 5MB
      [FileType.FEATURED]: 5 * 1024 * 1024, // 5MB
      [FileType.CONTENT]: 5 * 1024 * 1024, // 5MB
      [FileType.GALLERY]: 5 * 1024 * 1024, // 5MB
      [FileType.DOCUMENT]: 10 * 1024 * 1024, // 10MB
      [FileType.VIDEO]: 100 * 1024 * 1024, // 100MB
      [FileType.AUDIO]: 50 * 1024 * 1024, // 50MB
      [FileType.OTHER]: 10 * 1024 * 1024, // 10MB
    };

    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size too large. Maximum size for ${type} is ${this.formatFileSize(maxSize)}`
      );
    }

    // Check file content
    if (file.size === 0) {
      throw new BadRequestException('Empty file provided');
    }

    // Type-specific validation
    switch (type) {
      case FileType.THUMBNAIL:
      case FileType.FEATURED:
      case FileType.CONTENT:
      case FileType.GALLERY:
        this.validateImageFile(file);
        break;
      case FileType.VIDEO:
        this.validateVideoFile(file);
        break;
      case FileType.AUDIO:
        this.validateAudioFile(file);
        break;
      case FileType.DOCUMENT:
        this.validateDocumentFile(file);
        break;
    }
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: any): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid image type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate video file
   */
  private validateVideoFile(file: any): void {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid video type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate audio file
   */
  private validateAudioFile(file: any): void {
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid audio type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate document file
   */
  private validateDocumentFile(file: any): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid document type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format Cloudinary upload result
   */
  private formatUploadResult(result: UploadApiResponse): CloudinaryUploadResult {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      url: result.url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  }
}
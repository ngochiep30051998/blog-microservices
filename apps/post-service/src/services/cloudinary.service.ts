import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
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
   * Upload thumbnail image (800x450, optimized for web)
   */
  async uploadThumbnail(file: any): Promise<CloudinaryUploadResult> {
    this.validateImageFile(file);

    const uploadOptions = {
      folder: 'blog/thumbnails',
      public_id: `thumb_${Date.now()}`,
      transformation: [
        { width: 800, height: 450, crop: 'fill', gravity: 'center' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      overwrite: true,
      resource_type: 'image' as const,
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error) {
      throw new BadRequestException(`Failed to upload thumbnail: ${error.message}`);
    }
  }

  /**
   * Upload featured image (1200x630, optimized for social sharing)
   */
  async uploadFeaturedImage(file: any): Promise<CloudinaryUploadResult> {
    this.validateImageFile(file);

    const uploadOptions = {
      folder: 'blog/featured',
      public_id: `featured_${Date.now()}`,
      transformation: [
        { width: 1200, height: 630, crop: 'fill', gravity: 'center' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      overwrite: true,
      resource_type: 'image' as const,
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error) {
      throw new BadRequestException(`Failed to upload featured image: ${error.message}`);
    }
  }

  /**
   * Upload content image (responsive, multiple sizes)
   */
  async uploadContentImage(file: any): Promise<CloudinaryUploadResult> {
    this.validateImageFile(file);

    const uploadOptions = {
      folder: 'blog/content',
      public_id: `content_${Date.now()}`,
      transformation: [
        { width: 1024, height: 1024, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      overwrite: true,
      resource_type: 'image' as const,
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error) {
      throw new BadRequestException(`Failed to upload content image: ${error.message}`);
    }
  }

  /**
   * Upload gallery image (optimized for gallery display)
   */
  async uploadGalleryImage(file: any): Promise<CloudinaryUploadResult> {
    this.validateImageFile(file);

    const uploadOptions = {
      folder: 'blog/gallery',
      public_id: `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      overwrite: true,
      resource_type: 'image' as const,
    };

    try {
      const result = await this.cloudinaryInstance.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions
      );

      return this.formatUploadResult(result);
    } catch (error) {
      throw new BadRequestException(`Failed to upload gallery image: ${error.message}`);
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
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await this.cloudinaryInstance.uploader.destroy(publicId);
    } catch (error) {
      console.warn(`Failed to delete image ${publicId}:`, error.message);
      // Don't throw error - image deletion is not critical
    }
  }

  /**
   * Get image info
   */
  async getImageInfo(publicId: string): Promise<any> {
    try {
      return await this.cloudinaryInstance.api.resource(publicId);
    } catch (error) {
      throw new BadRequestException(`Failed to get image info: ${error.message}`);
    }
  }

  /**
   * Generate signed upload URL for direct client uploads
   */
  generateSignedUploadUrl(folder: string, publicId?: string): {
    url: string;
    signature: string;
    timestamp: number;
    apiKey: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params: any = {
      timestamp,
      folder,
      quality: 'auto:good',
      format: 'webp'
    };

    if (publicId) {
      params.public_id = publicId;
    }

    const signature = this.cloudinaryInstance.utils.api_sign_request(
      params,
      this.cloudinaryInstance.config().api_secret
    );

    return {
      url: `https://api.cloudinary.com/v1_1/${this.cloudinaryInstance.config().cloud_name}/image/upload`,
      signature,
      timestamp,
      apiKey: this.cloudinaryInstance.config().api_key || '',
    };
  }

  /**
   * Validate uploaded file
   */
  private validateImageFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    // Check if file has content
    if (file.size === 0) {
      throw new BadRequestException('Empty file provided');
    }
  }

  /**
   * Format Cloudinary upload result
   */
  private formatUploadResult(result: UploadApiResponse): CloudinaryUploadResult {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  }
}
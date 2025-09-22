import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth(): {
    message: string;
    service: string;
    timestamp: string;
    version: string;
    environment: string;
  } {
    return {
      message: 'Upload Service is running',
      service: 'upload-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }

  getDetailedHealth(): {
    status: string;
    service: string;
    version: string;
    timestamp: string;
    uptime: number;
    environment: string;
    config: {
      mongodb: {
        uri: string;
        connected: boolean;
      };
      cloudinary: {
        cloudName: string;
        configured: boolean;
      };
      limits: {
        maxFileSize: string;
        maxFilesPerUpload: number;
        uploadRateLimit: number;
      };
    };
  } {
    const maxFileSize = this.configService.get('MAX_FILE_SIZE', 100 * 1024 * 1024);
    
    return {
      status: 'healthy',
      service: 'upload-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV', 'development'),
      config: {
        mongodb: {
          uri: this.configService.get('MONGODB_URI', 'mongodb://localhost:27017/blog-uploads'),
          connected: true, // TODO: Add actual connection check
        },
        cloudinary: {
          cloudName: this.configService.get('CLOUDINARY_CLOUD_NAME', 'not-configured'),
          configured: !!this.configService.get('CLOUDINARY_CLOUD_NAME'),
        },
        limits: {
          maxFileSize: this.formatBytes(maxFileSize),
          maxFilesPerUpload: this.configService.get('MAX_FILES_PER_UPLOAD', 10),
          uploadRateLimit: this.configService.get('UPLOAD_RATE_LIMIT', 10),
        },
      },
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
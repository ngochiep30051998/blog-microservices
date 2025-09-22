import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';

// Shared imports
import { AuthModule } from '@blog/shared/auth';

// Config
import { CloudinaryProvider } from '../config/cloudinary.config';
import { mongooseConfigFactory } from '../config/mongoose.config';

// Entity & Schema
import { FileUpload, FileUploadSchema } from '../entities/file-upload.entity';

// Services
import { UploadService } from '../services/upload.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { AppService } from './app.service';

// Controllers
import { UploadController } from '../controllers/upload.controller';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - MongoDB with Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mongooseConfigFactory,
      inject: [ConfigService],
    }),

    // Schema registration
    MongooseModule.forFeature([
      { name: FileUpload.name, schema: FileUploadSchema }
    ]),

    // Rate limiting for uploads
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          ttl: 60000, // 1 minute
          limit: configService.get('UPLOAD_RATE_LIMIT', 10), // 10 uploads per minute
        }]
      }),
      inject: [ConfigService],
    }),

    // File upload configuration
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE', 100 * 1024 * 1024), // 100MB default
        },
      }),
      inject: [ConfigService],
    }),

    // Authentication module
    AuthModule,
  ],
  
  controllers: [
    AppController,
    UploadController,
  ],
  
  providers: [
    AppService,
    UploadService,
    CloudinaryService,
    CloudinaryProvider,
  ],
  
  exports: [
    UploadService,
    CloudinaryService,
  ],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    // Log configuration on startup
    console.log('🔧 Upload Service Configuration:');
    console.log(`   MongoDB URI: ${this.configService.get('MONGODB_URI', 'mongodb://localhost:27017/blog-uploads')}`);
    console.log(`   Cloudinary: ${this.configService.get('CLOUDINARY_CLOUD_NAME', 'not-configured')}`);
    console.log(`   Max File Size: ${this.formatBytes(this.configService.get('MAX_FILE_SIZE', 100 * 1024 * 1024))}`);
    console.log(`   Upload Rate Limit: ${this.configService.get('UPLOAD_RATE_LIMIT', 10)}/minute`);
    console.log(`   Environment: ${this.configService.get('NODE_ENV', 'development')}`);
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
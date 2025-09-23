import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongooseConfigFactory } from '../config/mongoose.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '@blog/shared/auth';
import { FileUpload, FileUploadSchema } from '../entities/file-upload.entity';
import { UploadController } from '../controllers/files.controller';
import { FilesService } from '../services/files.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { CloudinaryProvider } from '../config/cloudinary.config';

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
  controllers: [AppController, UploadController],
  providers: [
    AppService, 
    FilesService, 
    CloudinaryService,
    CloudinaryProvider
  ],
})
export class AppModule { }

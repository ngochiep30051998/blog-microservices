import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

// Shared imports
import { AuthModule } from '@blog/shared/auth';
// import { getKafkaConfig } from '@blog/shared/kafka';

// Local imports
import { Post } from '../entities/post.entity';
import { Category } from '../entities/category.entity';
import { PostView } from '../entities/post-view.entity';

import { PostService } from '../services/post.service';
import { CategoryService } from '../services/category.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';
import { CloudinaryService } from '../services/cloudinary.service';

import { PostController } from '../controllers/post.controller';
import { CategoryController } from '../controllers/category.controller';

import { CloudinaryProvider } from '../config/cloudinary.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'blog_user'),
        password: configService.get('POSTGRES_PASSWORD', 'blog_password_2024'),
        database: configService.get('POSTGRES_DB', 'blog_db') + '_posts',
        entities: [Post, Category, PostView],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
        keepConnectionAlive: true,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([Post, Category, PostView]),

    // File upload configuration
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10, // Max 10 files for gallery
      },
      fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),

    // Shared modules
    AuthModule,
  ],

  controllers: [PostController, CategoryController],

  providers: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
    CloudinaryService,
    CloudinaryProvider,
  ],

  exports: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
    CloudinaryService,
  ],
})
export class AppModule {}

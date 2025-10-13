import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared imports
import { AuthModule } from '@blog/shared/auth';

// Local imports
import { Post } from '../entities/post.entity';
import { Category } from '../entities/category.entity';
import { PostView } from '../entities/post-view.entity';

import { PostService } from '../services/post.service';
import { CategoryService } from '../services/category.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';

import { PostController } from '../controllers/post.controller';
import { CategoryController } from '../controllers/category.controller';

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
        database: configService.get('POSTGRES_DB_POST', 'blog_posts'),
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

    // Shared modules
    AuthModule,
  ],

  controllers: [CategoryController, PostController],

  providers: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
  ],

  exports: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
  ],
})
export class AppModule {}

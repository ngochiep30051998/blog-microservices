import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Shared imports - NO USER SERVICE DEPENDENCY
import { AuthModule } from '@blog/shared/auth';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { UserProxyController } from '../controllers/user-proxy.controller';
import { PostProxyController } from '../controllers/post-proxy.controller';
import { CategoryProxyController } from '../controllers/category-proxy.controller';
import { HealthController } from '../controllers/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    // File upload configuration for proxy
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
    AuthModule, // Only shared auth, no user service
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [
    AppController, 
    UserProxyController, 
    PostProxyController,
    CategoryProxyController,
    HealthController
  ],
  providers: [
    AppService,
    MicroserviceProxyService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
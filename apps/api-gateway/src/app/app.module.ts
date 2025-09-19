import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Shared imports - NO USER SERVICE DEPENDENCY
import { AuthModule } from '@blog/shared/auth';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { UserProxyController } from '../controllers/user-proxy.controller';
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
    AuthModule, // Only shared auth, no user service
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [AppController, UserProxyController, HealthController],
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
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared imports
import { KafkaModule } from '@blog/shared/kafka';
import { AuthModule } from '@blog/shared/auth'; // Basic auth

// Local imports
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { EnhancedJwtStrategy } from '../auth/enhanced-jwt.strategy'; // Enhanced auth

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [User],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    KafkaModule,
    AuthModule, // Import shared auth
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // Optionally provide enhanced strategy for this service only
    EnhancedJwtStrategy,
  ],
  exports: [UserService],
})
export class AppModule {}
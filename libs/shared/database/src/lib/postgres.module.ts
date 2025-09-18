import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('POSTGRES_HOST', 'localhost'),
                port: configService.get('POSTGRES_PORT', 5432),
                username: configService.get('POSTGRES_USER', 'blog_user'),
                password: configService.get('POSTGRES_PASSWORD', 'blog_password_2024'),
                database: configService.get('POSTGRES_DB', 'blog_db'),
                entities: ['dist/**/*.entity{.ts,.js}'],
                synchronize: configService.get('NODE_ENV') === 'development',
                logging: configService.get('NODE_ENV') === 'development',
                ssl: configService.get('NODE_ENV') === 'production',
            }),
            inject: [ConfigService],
        }),
    ],
})
export class PostgresModule { }

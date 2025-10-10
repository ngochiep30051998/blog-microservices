import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { SwaggerConfigBuilder } from '@blog/shared/utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: configService.get('CORS_ORIGINS').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });
  // Swagger setup for development
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = SwaggerConfigBuilder.createConfig({
      title: 'User Service API',
      description: `
# User Service - Blog Microservices

This service handles all user-related operations including:

## Features
- 🔐 User registration and authentication
- 👤 Profile management
- 🔑 Password management
- 👥 Role-based access control
- 📧 Email verification (future)
- 🔒 Account security features

## Authentication
This service generates JWT tokens for authentication:
- Register new users
- Login existing users  
- Manage user profiles
- Handle password changes

## Events Published
- \`user.created\` - When a new user registers
- \`user.updated\` - When user profile is updated
- \`user.login\` - When user logs in
- \`user.password_changed\` - When password is changed
- \`user.deactivated\` - When account is deactivated

## Database
- PostgreSQL with TypeORM
- UUID primary keys
- Encrypted passwords with bcrypt
- Indexed email and username fields
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('USER_SERVICE_PORT', 3001)}`,
      serverDescription: 'User Service Development Server',
    });

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 User Service Swagger: http://localhost:${configService.get('USER_SERVICE_PORT', 3001)}/docs`);
  }

  const port = configService.get('USER_SERVICE_PORT', 3001);
  await app.listen(port);
  
  console.log(`👤 User Service running on port ${port}`);
}

bootstrap();
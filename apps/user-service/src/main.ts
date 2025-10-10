import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { SwaggerConfigBuilder } from '@blog/shared/utils';
import {
  UserResponseDto,
  UpdateUserDto,
  ChangePasswordDto,
  SuccessResponseDto,
  PaginationDto,
} from '@blog/shared/dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS for development
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
        User Service API - Handles user management, profiles, and user-related operations.
        
        ## Authentication
        This API uses JWT Bearer tokens for authentication. Include your token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Features
        - User profile management
        - User search and listing (Admin only)
        - Password management
        - Account operations
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('API_GATEWAY_PORT', 9007)}`,
      serverDescription: 'User Service Development Server',
    });

    const documentOptions = SwaggerConfigBuilder.createDocumentOptions([
      UserResponseDto,
      UpdateUserDto,
      ChangePasswordDto,
      SuccessResponseDto,
      PaginationDto,
    ]);
    const document = SwaggerModule.createDocument(app, swaggerConfig, documentOptions);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 User Service Swagger: http://localhost:${configService.get('USER_SERVICE_PORT', 9007)}/docs`);
  }

  const port = configService.get('USER_SERVICE_PORT', 9007);
  await app.listen(port);
  
  console.log(`👤 Auth Service running on port ${port}`);
}

bootstrap();
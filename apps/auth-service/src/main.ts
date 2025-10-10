import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { SwaggerConfigBuilder } from '@blog/shared/utils';
import {
  UserResponseDto,
  CreateUserDto,
  LoginDto,
  AuthResponseDto,
  SuccessResponseDto,
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
      title: 'Auth Service API',
      description: `
        Auth Service API - Handles user authentication and registration.
        
        ## Authentication
        This API provides JWT tokens for authenticated users. Use the login endpoint to get your token.
        
        ## Features
        - User registration with validation
        - User login with JWT token generation
        - Health check endpoint
        - Secure password handling
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('API_GATEWAY_PORT', 9007)}`,
      serverDescription: 'Auth Service Development Server',
    });

    const documentOptions = SwaggerConfigBuilder.createDocumentOptions([
      UserResponseDto,
      CreateUserDto,
      LoginDto,
      AuthResponseDto,
      SuccessResponseDto,
    ]);
    const document = SwaggerModule.createDocument(app, swaggerConfig, documentOptions);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 Auth Service Swagger: http://localhost:${configService.get('AUTH_SERVICE_PORT', 9007)}/docs`);
  }

  const port = configService.get('AUTH_SERVICE_PORT', 9007);
  await app.listen(port);
  
  console.log(`👤 Auth Service running on port ${port}`);
}

bootstrap();
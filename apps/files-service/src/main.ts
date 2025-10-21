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
      title: 'Files Service API',
      description: `
**Files Service** for the Blog Microservices Platform.

## Features

### 📁 File Management
- Multiple file type support (images, videos, audio, documents)
- Cloud storage integration with Cloudinary
- Automatic file optimization and responsive variants
- MongoDB metadata storage with comprehensive indexing
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('API_GATEWAY_PORT', 9007)}`,
      serverDescription: 'Files Service Development Server',
    });

    const documentOptions = SwaggerConfigBuilder.createDocumentOptions();
    const document = SwaggerModule.createDocument(app, swaggerConfig, documentOptions);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 Files Service Swagger: http://localhost:${configService.get('FILES_SERVICE_PORT', 9007)}/docs`);
  }

  const port = configService.get('FILES_SERVICE_PORT', 9007);
  await app.listen(port);

  console.log(`👤 Auth Service running on port ${port}`);
}

bootstrap();
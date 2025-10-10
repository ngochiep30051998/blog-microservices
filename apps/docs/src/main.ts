import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

    const config = new DocumentBuilder()
      .setTitle('Blog microservices - Docs')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT Authentication',
          description: 'Enter your JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .setExternalDoc('Postman Collection', '/api/docs-json')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory, {
      explorer: true,
      urls: [
        {
          name: '1. User API',
          url: 'http://localhost:9001/docs-json',
        },
        {
          name: '2. Posts API',
          url: 'http://localhost:9002/docs-json',
        },
        {
          name: '3. Auth API',
          url: 'http://localhost:9007/docs-json',
        },
      ],
      jsonDocumentUrl: '/api/swagger.json',
    });


    console.log(`📚 Docs Swagger: http://localhost:${configService.get('DOCS_SERVICE_PORT', 9008)}`);
  }

  const port = configService.get('DOCS_SERVICE_PORT', 9008);
  await app.listen(port);

  console.log(`👤 Docs running on port ${port}`);
}

bootstrap();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // CORS for development
  app.enableCors({
    origin: configService.get('CORS_ORIGINS').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Global prefix
  // app.setGlobalPrefix('');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Post Service API')
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token from User Service login',
      })
      .addServer(`http://localhost:${configService.get('API_GATEWAY_PORT', 9000)}`, 'API gateway Server')
      .addTag('Posts', 'Blog post CRUD operations with rich content management')
      .addTag('Categories', 'Hierarchical category management for post organization')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    console.log(`📚 Post Service Swagger: http://localhost:${configService.get('API_GATEWAY_PORT', 3002)}/docs`);
  }

  const port = configService.get('POST_SERVICE_PORT', 3002);
  await app.listen(port);

  console.log(`📝 Post Service is running on port ${port}`);
  console.log(`🔗 Service URL: http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start Post Service:', err);
  process.exit(1);
});

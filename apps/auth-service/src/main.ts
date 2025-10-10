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
    origin: ['http://localhost:9000', 'http://localhost:9001'],
    credentials: true,
  });
  // Swagger setup for development
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = SwaggerConfigBuilder.createConfig({
      title: 'Auth Service API',
      description: `
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('AUTH_SERVICE_PORT', 9007)}`,
      serverDescription: 'Auth Service Development Server',
    });

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 Auth Service Swagger: http://localhost:${configService.get('AUTH_SERVICE_PORT', 9007)}/docs`);
  }

  const port = configService.get('AUTH_SERVICE_PORT', 9007);
  await app.listen(port);
  
  console.log(`👤 Auth Service running on port ${port}`);
}

bootstrap();
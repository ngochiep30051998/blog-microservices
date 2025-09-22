import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { SwaggerConfigBuilder } from '@blog/shared/utils';
var compression = require('compression')
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // Compression
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', 'http://localhost:9000,http://localhost:9001').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: configService.get('NODE_ENV') === 'production',
    validationError: {
      target: false,
      value: false,
    },
  }));

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // No global prefix needed - versioning handles it
  // app.setGlobalPrefix('api', {
  //   exclude: ['health', 'docs', 'docs-json', 'docs-yaml'],
  // });

  // Swagger setup
  const swaggerConfig = SwaggerConfigBuilder.createConfig({
    title: 'Blog Microservices API',
    description: `
# Blog Microservices API Documentation

Welcome to the comprehensive API documentation for our Blog Microservices system.

## Features
- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 👥 **User Management** - Complete user lifecycle management
- 📝 **Blog Posts** - Create, read, update, and delete blog posts
- 💬 **Comments** - Interactive comment system with moderation
- 🔔 **Notifications** - Real-time notifications via multiple channels
- 📊 **Analytics** - Comprehensive analytics and reporting

## Architecture
This API serves as the gateway to our microservices architecture:
- **User Service** - Handles authentication and user management
- **Post Service** - Manages blog posts and content
- **Comment Service** - Handles comments and interactions
- **Notification Service** - Manages notifications and communications
- **Analytics Service** - Provides insights and analytics

## Authentication
Most endpoints require authentication using JWT Bearer tokens:
1. Register a new account or login with existing credentials
2. Use the returned access_token in the Authorization header
3. Format: \`Authorization: Bearer <your-token>\`

## Rate Limiting
API calls are rate limited to prevent abuse:
- **100 requests per minute** per IP address
- **1000 requests per hour** per authenticated user

## Support
- 📧 Email: support@yourdomain.com
- 📖 Documentation: [API Docs](https://api.yourdomain.com/docs)
- 💻 GitHub: [Repository](https://github.com/your-org/blog-microservices)
    `,
    version: '1.0.0',
    serverUrl: `http://localhost:${configService.get('API_GATEWAY_PORT', 9000)}`,
    serverDescription: 'Development Server',
  });

  const documentOptions = SwaggerConfigBuilder.createDocumentOptions();
  const document = SwaggerModule.createDocument(app, swaggerConfig, documentOptions);
  
  const swaggerUIOptions = SwaggerConfigBuilder.getSwaggerUIOptions();
  SwaggerModule.setup('docs', app, document, swaggerUIOptions);

  // Additional endpoints for OpenAPI spec
  SwaggerModule.setup('docs-json', app, document, {
    jsonDocumentUrl: '/docs-json',
    yamlDocumentUrl: '/docs-yaml',
  });

  const port = configService.get('API_GATEWAY_PORT', 9000);
  await app.listen(port);
  
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  console.log(`📄 OpenAPI JSON: http://localhost:${port}/docs-json`);
  console.log(`📄 OpenAPI YAML: http://localhost:${port}/docs-yaml`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start API Gateway:', error);
  process.exit(1);
});
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
    origin: [
      process.env.API_GATEWAY_URL, // API Gateway
      process.env.USER_SERVICE_URL, // User Service
      'http://localhost:4200', // Angular frontend
      'http://localhost:3000', // React frontend
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('posts');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Post Service API')
      .setDescription(`
**Post Service** for the Blog Microservices Platform.

## Features

### 📝 Content Management
- Rich text posts with markdown/HTML support
- Draft/Published/Scheduled workflow
- Content analysis (reading time, word count)
- SEO optimization tools

### 🖼️ Media Management
- Cloudinary integration for image optimization
- Thumbnail and featured image support
- Gallery images for rich content
- Automatic image optimization (WebP, responsive)

### 🏷️ Organization
- Hierarchical categories (3 levels)
- Tag system for flexible organization
- Featured posts highlighting
- Multi-language support

### 📊 Analytics & Engagement
- Post view tracking with analytics
- Social sharing metadata
- Related posts recommendations
- Comprehensive statistics

### 🔍 Search & Discovery
- Full-text search in titles and content
- Category and tag filtering
- Author-based filtering
- Popular posts algorithms

## Authentication
All content modification endpoints require JWT authentication.
Some endpoints require specific roles (admin, editor).

## Content Types
- \`markdown\` - Markdown formatted content (default)
- \`html\` - Raw HTML content
- \`rich_text\` - Rich text editor formatted content

## Post Status Workflow
1. **Draft** - Private, editable by author
2. **Published** - Public, visible to all users
3. **Scheduled** - Automatically published at specified time
4. **Archived** - Hidden from public but preserved
5. **Deleted** - Soft deleted, recoverable by admin

## Image Upload & Optimization
All images are automatically optimized through Cloudinary:
- **Thumbnails**: 800x450px, WebP format
- **Featured Images**: 1200x630px for social sharing
- **Content Images**: Responsive with multiple sizes
- **Gallery Images**: Optimized for fast loading
      `)
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token from User Service login',
      })
      .addServer(`http://localhost:${configService.get('POST_SERVICE_PORT', 3002)}`, 'Development Server')
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

    console.log(`📚 Post Service Swagger: http://localhost:${configService.get('POST_SERVICE_PORT', 3002)}/docs`);
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

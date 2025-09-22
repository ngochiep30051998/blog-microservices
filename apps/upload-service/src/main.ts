import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS for development
  app.enableCors({
    origin: [
      process.env['API_GATEWAY_URL'], // API Gateway
      process.env['POST_SERVICE_URL'], // Post Service
      process.env['USER_SERVICE_URL'], // User Service
      'http://localhost:4200', // Angular frontend
      'http://localhost:3000', // React frontend
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('uploads');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Upload Service API')
      .setDescription(`
**Upload Service** for the Blog Microservices Platform.

## Features

### 📁 File Management
- Multiple file type support (images, videos, audio, documents)
- Cloud storage integration with Cloudinary
- Automatic file optimization and responsive variants
- MongoDB metadata storage with comprehensive indexing

### 🖼️ Image Processing
- **Thumbnail**: 800x450, optimized for web display
- **Featured**: 1200x630, optimized for social sharing
- **Content**: Max 1024x1024, for rich text content
- **Gallery**: 800x800, for image galleries

### 📊 Analytics & Tracking
- View and download tracking
- File usage statistics
- Storage usage monitoring
- User activity analytics

### 🔒 Security & Performance
- JWT authentication required
- Rate limiting (10 uploads/minute/IP)
- File validation and sanitization
- Soft delete with recovery options

### 🚀 Advanced Features
- Bulk upload operations
- Responsive image variants
- SEO metadata support
- Integration with post and category systems

## Supported File Types

### Images (max 5MB)
- JPEG, PNG, WebP, GIF
- Automatic optimization and WebP conversion
- Responsive variants generation

### Videos (max 100MB)
- MP4, WebM, QuickTime, AVI
- Automatic transcoding and optimization

### Audio (max 50MB)
- MP3, WAV, OGG
- Quality optimization

### Documents (max 10MB)
- PDF, DOC, DOCX, TXT, CSV

## Rate Limiting
- 10 uploads per minute per IP address
- Additional throttling for bulk operations

## Authentication
All endpoints require JWT authentication via Bearer token.

## Storage
- Files stored in Cloudinary CDN
- Metadata stored in MongoDB
- Automatic backup and versioning
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Health', 'Service health and status endpoints')
      .addTag('File Upload', 'File upload and management endpoints')
      .addTag('File Management', 'File metadata and operations')
      .addTag('Statistics', 'Upload and storage statistics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
      },
      customSiteTitle: 'Upload Service API Documentation',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });
  }

  const port = configService.get('UPLOAD_SERVICE_PORT', 9006);
  await app.listen(port);

  console.log(`🚀 Upload Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🗄️  Database: ${configService.get('MONGODB_URI', 'mongodb://localhost:27017/blog-uploads')}`);
  console.log(`☁️  Cloud Storage: Cloudinary (${configService.get('CLOUDINARY_CLOUD_NAME', 'not-configured')})`);
}

bootstrap().catch((error) => {
  console.error('Failed to start upload service:', error);
  process.exit(1);
});
import { DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  serverUrl?: string;
  serverDescription?: string;
}

export class SwaggerConfigBuilder {
  static createConfig(config: SwaggerConfig) {
    const builder = new DocumentBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setVersion(config.version)
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
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key for service-to-service communication',
        },
        'api-key'
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management operations')
      .addTag('Posts', 'Blog post management')
      .addTag('Comments', 'Comment management')
      .addTag('Notifications', 'Notification services')
      .addTag('Analytics', 'Analytics and reporting')
      .addTag('Health', 'Health check endpoints')
      .setContact(
        'Blog Microservices API',
        'https://github.com/your-org/blog-microservices',
        'support@yourdomain.com'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .setExternalDoc('Postman Collection', '/api/docs-json');

    if (config.serverUrl) {
      builder.addServer(config.serverUrl, config.serverDescription || 'Development server');
    }

    return builder.build();
  }

  static createDocumentOptions(): SwaggerDocumentOptions {
    return {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
    };
  }

  static getSwaggerUIOptions() {
    return {
      customSiteTitle: 'Blog Microservices API Documentation',
      customfavIcon: 'https://nestjs.com/img/logo_text.svg',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #e53e3e; font-size: 36px; }
        .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
        .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
        .swagger-ui .opblock-tag { font-size: 18px; font-weight: bold; }
        .swagger-ui .btn.authorize { background-color: #e53e3e; border-color: #e53e3e; }
        .swagger-ui .btn.authorize:hover { background-color: #c53030; border-color: #c53030; }
        .swagger-ui .opblock.opblock-post { border-color: #38a169; }
        .swagger-ui .opblock.opblock-get { border-color: #3182ce; }
        .swagger-ui .opblock.opblock-put { border-color: #d69e2e; }
        .swagger-ui .opblock.opblock-delete { border-color: #e53e3e; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
    };
  }
}
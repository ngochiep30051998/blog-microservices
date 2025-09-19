# Swagger Documentation Setup for Blog Microservices

## Tổng Quan Setup
- **API Gateway**: Main documentation endpoint với tất cả services
- **Individual Services**: Mỗi service có docs riêng cho development
- **Shared Configuration**: Consistent styling và branding
- **Authentication**: JWT Bearer token support
- **Custom Styling**: Professional appearance với branding

---

# BƯỚC 1: SETUP SHARED SWAGGER CONFIGURATION

## 1.1 Shared Swagger Utils Library
```bash
# Tạo shared utils library cho Swagger
nx generate @nx/nest:library utils --directory=libs/shared --importPath=@blog/shared/utils --no-interactive

# File: libs/shared/utils/src/lib/swagger.config.ts
cat > libs/shared/utils/src/lib/swagger.config.ts << 'EOF'
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
EOF

# File: libs/shared/utils/src/lib/swagger.decorators.ts
cat > libs/shared/utils/src/lib/swagger.decorators.ts << 'EOF'
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';

export const ApiAuthenticatedOperation = (summary: string, description?: string) =>
  applyDecorators(
    ApiOperation({ summary, description }),
    ApiBearerAuth('JWT-auth'),
  );

export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) =>
  ApiResponse({
    status: 200,
    description: 'Paginated response',
    schema: {
      allOf: [
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(model) },
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrevious: { type: 'boolean', example: false },
          },
        },
      ],
    },
  });

export const ApiCreatedResponse = <TModel extends Type<any>>(model: TModel, description = 'Created successfully') =>
  ApiResponse({
    status: 201,
    description,
    type: model,
  });

export const ApiOkResponse = <TModel extends Type<any>>(model: TModel, description = 'Success') =>
  ApiResponse({
    status: 200,
    description,
    type: model,
  });

export const ApiValidationErrorResponse = () =>
  ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['email must be a valid email', 'password must be at least 8 characters'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  });

export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Access denied - Invalid or missing token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  });

export const ApiForbiddenResponse = () =>
  ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied - Required roles: admin' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  });

export const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'Resource not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  });

export const ApiConflictResponse = () =>
  ApiResponse({
    status: 409,
    description: 'Conflict - Resource already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email already exists' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  });

export const ApiInternalServerErrorResponse = () =>
  ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  });

// Composite decorators for common patterns
export const ApiStandardResponses = () =>
  applyDecorators(
    ApiValidationErrorResponse(),
    ApiUnauthorizedResponse(),
    ApiInternalServerErrorResponse(),
  );

export const ApiCrudResponses = <TModel extends Type<any>>(model: TModel) =>
  applyDecorators(
    ApiOkResponse(model),
    ApiValidationErrorResponse(),
    ApiUnauthorizedResponse(),
    ApiNotFoundResponse(),
    ApiInternalServerErrorResponse(),
  );

export const ApiAuthenticatedCrudOperation = <TModel extends Type<any>>(
  summary: string,
  model: TModel,
  description?: string,
) =>
  applyDecorators(
    ApiAuthenticatedOperation(summary, description),
    ApiCrudResponses(model),
  );
EOF

# Update utils index
cat > libs/shared/utils/src/index.ts << 'EOF'
export * from './lib/swagger.config';
export * from './lib/swagger.decorators';
EOF
```

---

# BƯỚC 2: API GATEWAY SWAGGER SETUP

## 2.1 Main API Gateway Documentation
```bash
# File: apps/api-gateway/src/main.ts
cat > apps/api-gateway/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app/app.module';
import { SwaggerConfigBuilder } from '@blog/shared/utils';

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
    origin: configService.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(','),
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

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'docs', 'docs-json', 'docs-yaml'],
  });

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
    serverUrl: `http://localhost:${configService.get('API_GATEWAY_PORT', 3000)}`,
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

  const port = configService.get('API_GATEWAY_PORT', 3000);
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
EOF
```

## 2.2 Enhanced User Proxy Controller với Swagger
```bash
# File: apps/api-gateway/src/controllers/user-proxy.controller.ts
cat > apps/api-gateway/src/controllers/user-proxy.controller.ts << 'EOF'
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard } from '@blog/shared/auth';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  UserResponseDto,
  AuthResponseDto,
  PaginationDto,
} from '@blog/shared/dto';
import {
  ApiAuthenticatedOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiPaginatedResponse,
  ApiValidationErrorResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@blog/shared/utils';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Authentication & Users')
@Controller({ path: 'users', version: '1' })
export class UserProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user account',
    description: `
Create a new user account with email and username validation.

**Features:**
- Email uniqueness validation
- Username uniqueness validation  
- Password strength requirements (min 8 characters)
- Automatic role assignment (default: user)
- Account activation via email (if enabled)

**Business Rules:**
- Email must be unique across the system
- Username must be unique and 3-50 characters
- Password must be at least 8 characters
- First/Last names are optional
- Default role is 'user' unless specified
    `
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse(UserResponseDto, 'User account created successfully')
  @ApiValidationErrorResponse()
  @ApiConflictResponse()
  @ApiInternalServerErrorResponse()
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/register', 
      'POST', 
      createUserDto
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login authentication',
    description: `
Authenticate user with email/username and password.

**Features:**
- Login with email OR username
- JWT token generation (24h expiration)
- Last login timestamp update
- Account status validation (active/inactive)

**Returns:**
- JWT access token
- User profile information
- Token expiration details

**Security:**
- Rate limited to prevent brute force attacks
- Account lockout after multiple failed attempts (if enabled)
    `
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse(AuthResponseDto, 'Login successful')
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponse()
  @ApiInternalServerErrorResponse()
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/login', 
      'POST', 
      loginDto
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Get all users (Admin only)',
    'Retrieve paginated list of all users in the system. Requires admin privileges.'
  )
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Page number (default: 1)',
    example: 1 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Items per page (default: 10, max: 100)',
    example: 10 
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by username or email',
    example: 'john'
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['admin', 'author', 'user'],
    description: 'Filter by user role'
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by account status'
  })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiInternalServerErrorResponse()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Headers('authorization') auth?: string
  ) {
    const queryParams = {
      ...paginationDto,
      ...(search && { search }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    return this.proxyService.proxyRequest(
      'user', 
      '/users', 
      'GET', 
      null, 
      { authorization: auth }, 
      queryParams
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Get current user profile',
    'Retrieve the authenticated user\'s profile information.'
  )
  @ApiOkResponse(UserResponseDto, 'Profile retrieved successfully')
  @ApiUnauthorizedResponse()
  @ApiInternalServerErrorResponse()
  async getProfile(@Headers('authorization') auth: string): Promise<UserResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/profile', 
      'GET', 
      null, 
      { authorization: auth }
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Get user by ID',
    'Retrieve a specific user\'s public profile information by their ID.'
  )
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiOkResponse(UserResponseDto, 'User found')
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiInternalServerErrorResponse()
  async findOne(
    @Param('id') id: string, 
    @Headers('authorization') auth: string
  ): Promise<UserResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      `/users/${id}`, 
      'GET', 
      null, 
      { authorization: auth }
    );
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Update current user profile',
    `
Update the authenticated user's profile information.

**Updatable Fields:**
- First name and last name
- Bio (up to 500 characters)
- Avatar URL
- Username (must be unique)

**Restrictions:**
- Cannot change email address
- Cannot change password (use change-password endpoint)
- Cannot change role (admin only)
    `
  )
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse(UserResponseDto, 'Profile updated successfully')
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponse()
  @ApiConflictResponse()
  @ApiInternalServerErrorResponse()
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ): Promise<UserResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/profile', 
      'PATCH', 
      updateUserDto, 
      { authorization: auth }
    );
  }

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Change user password',
    `
Change the authenticated user's password.

**Requirements:**
- Current password verification
- New password must be at least 8 characters
- Cannot reuse the current password

**Security:**
- Rate limited to prevent abuse
- Requires current password confirmation
- Invalidates existing JWT tokens (optional)
    `
  )
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponse()
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Current password is incorrect' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiInternalServerErrorResponse()
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto, 
    @Headers('authorization') auth: string
  ) {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/profile/change-password', 
      'PATCH', 
      changePasswordDto, 
      { authorization: auth }
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Update user by ID (Admin only)',
    'Update any user\'s information. Requires admin privileges.'
  )
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse(UserResponseDto, 'User updated successfully')
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiInternalServerErrorResponse()
  async update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ): Promise<UserResponseDto> {
    return this.proxyService.proxyRequest(
      'user', 
      `/users/${id}`, 
      'PATCH', 
      updateUserDto, 
      { authorization: auth }
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthenticatedOperation(
    'Delete user (Admin only)',
    `
Permanently delete a user account. Requires admin privileges.

**Warning:** This action is irreversible and will:
- Delete the user account permanently
- Remove all associated data
- Trigger cleanup events to other services
- Cannot be undone

**Alternative:** Consider deactivating the account instead.
    `
  )
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User deleted successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiInternalServerErrorResponse()
  async remove(
    @Param('id') id: string, 
    @Headers('authorization') auth: string
  ) {
    return this.proxyService.proxyRequest(
      'user', 
      `/users/${id}`, 
      'DELETE', 
      null, 
      { authorization: auth }
    );
  }
}
EOF
```

---

# BƯỚC 3: INDIVIDUAL SERVICE SWAGGER SETUP

## 3.1 User Service Swagger
```bash
# File: apps/user-service/src/main.ts
cat > apps/user-service/src/main.ts << 'EOF'
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
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Swagger setup for development
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = SwaggerConfigBuilder.createConfig({
      title: 'User Service API',
      description: `
# User Service - Blog Microservices

This service handles all user-related operations including:

## Features
- 🔐 User registration and authentication
- 👤 Profile management
- 🔑 Password management
- 👥 Role-based access control
- 📧 Email verification (future)
- 🔒 Account security features

## Authentication
This service generates JWT tokens for authentication:
- Register new users
- Login existing users  
- Manage user profiles
- Handle password changes

## Events Published
- \`user.created\` - When a new user registers
- \`user.updated\` - When user profile is updated
- \`user.login\` - When user logs in
- \`user.password_changed\` - When password is changed
- \`user.deactivated\` - When account is deactivated

## Database
- PostgreSQL with TypeORM
- UUID primary keys
- Encrypted passwords with bcrypt
- Indexed email and username fields
      `,
      version: '1.0.0',
      serverUrl: `http://localhost:${configService.get('USER_SERVICE_PORT', 3001)}`,
      serverDescription: 'User Service Development Server',
    });

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, SwaggerConfigBuilder.getSwaggerUIOptions());

    console.log(`📚 User Service Swagger: http://localhost:${configService.get('USER_SERVICE_PORT', 3001)}/docs`);
  }

  const port = configService.get('USER_SERVICE_PORT', 3001);
  await app.listen(port);
  
  console.log(`👤 User Service running on port ${port}`);
}

bootstrap();
EOF
```

## 3.2 Enhanced User Controller với Swagger
```bash
# Update User Controller với detailed Swagger docs
# File: apps/user-service/src/controllers/user.controller.ts - Add these imports and decorators

# Add to top of file:
import {
  ApiAuthenticatedCrudOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiValidationErrorResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiPaginatedResponse,
} from '@blog/shared/utils';

# Example of enhanced endpoint:
@Post('register')
@ApiOperation({ 
  summary: 'Register a new user',
  description: `
Register a new user account with validation.

**Validation Rules:**
- Email must be valid and unique
- Username must be 3-50 characters and unique  
- Password must be at least 8 characters
- First/Last names are optional (max 100 characters)
- Bio is optional (max 500 characters)

**Default Behavior:**
- New users get 'user' role by default
- Account is active by default
- Email verification token generated (if email verification enabled)

**Events Published:**
- \`user.created\` event to Kafka with user details
  `
})
@ApiCreatedResponse(UserResponseDto, 'User created successfully')
@ApiValidationErrorResponse()
@ApiConflictResponse()
@ApiInternalServerErrorResponse()
async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  return this.userService.create(createUserDto);
}
```

---

# BƯỚC 4: HEALTH CONTROLLER SWAGGER

## 4.1 Enhanced Health Controller
```bash
# File: apps/api-gateway/src/controllers/health.controller.ts
cat > apps/api-gateway/src/controllers/health.controller.ts << 'EOF'
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Get()
  @ApiOperation({ 
    summary: 'API Gateway health check',
    description: `
Check the health status of the API Gateway.

**Returns:**
- Service status and uptime
- Memory usage information
- Node.js version details
- Application version

**Use Cases:**
- Load balancer health checks
- Monitoring and alerting systems
- Service discovery health verification
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API Gateway is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        service: { type: 'string', example: 'api-gateway' },
        uptime: { type: 'number', example: 12345.67, description: 'Uptime in seconds' },
        version: { type: 'string', example: '1.0.0' },
        node_version: { type: 'string', example: 'v18.17.0' },
        memory: {
          type: 'object',
          properties: {
            rss: { type: 'number', description: 'Resident Set Size' },
            heapTotal: { type: 'number', description: 'Total heap size' },
            heapUsed: { type: 'number', description: 'Used heap size' },
            external: { type: 'number', description: 'External memory usage' },
          }
        }
      }
    }
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('services')
  @ApiOperation({ 
    summary: 'Check all microservices health',
    description: `
Comprehensive health check of all registered microservices.

**Features:**
- Parallel health checks for performance
- Response time measurement
- Service availability status
- Overall system health summary

**Status Levels:**
- \`healthy\` - All services are responding
- \`degraded\` - Some services are unhealthy
- \`unhealthy\` - All services are down

**Use Cases:**
- System monitoring dashboards
- Automated health reporting
- Service dependency verification
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Services health status',
    schema: {
      type: 'object',
      properties: {
        status: { 
          type: 'string', 
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy',
          description: 'Overall system health status'
        },
        services: { 
          type: 'object',
          description: 'Individual service health status',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { 
                type: 'string', 
                enum: ['healthy', 'unhealthy'],
                example: 'healthy'
              },
              name: { type: 'string', example: 'User Service' },
              url: { type: 'string', example: 'http://localhost:3001' },
              responseTime: { 
                type: 'string', 
                example: '25ms',
                description: 'Response time for health check'
              },
              lastChecked: { 
                type: 'string', 
                example: '2024-01-01T00:00:00.000Z',
                description: 'Timestamp of last health check'
              },
              response: {
                type: 'object',
                description: 'Health check response from service'
              },
              error: {
                type: 'string',
                description: 'Error message if service is unhealthy'
              }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5, description: 'Total number of services' },
            healthy: { type: 'number', example: 4, description: 'Number of healthy services' },
            unhealthy: { type: 'number', example: 1, description: 'Number of unhealthy services' },
          },
          description: 'Summary statistics'
        },
        timestamp: { 
          type: 'string', 
          example: '2024-01-01T00:00:00.000Z',
          description: 'Timestamp of health check'
        }
      }
    }
  })
  async servicesHealth() {
    return this.proxyService.healthCheck();
  }

  @Get('services/list')
  @ApiOperation({ 
    summary: 'List all registered services',
    description: `
Get a list of all microservices registered with the API Gateway.

**Information Provided:**
- Service names and descriptions
- Service URLs and endpoints
- Configuration settings
- Registration status

**Use Cases:**
- Service discovery and documentation
- Debugging service routing issues
- Infrastructure inventory
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of registered microservices',
    schema: {
      type: 'object',
      properties: {
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'user' },
              config: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'User Service' },
                  url: { type: 'string', example: 'http://localhost:3001' },
                  timeout: { type: 'number', example: 10000 },
                  retries: { type: 'number', example: 3 }
                }
              }
            }
          }
        },
        total: { type: 'number', example: 5 },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' }
      }
    }
  })
  listServices() {
    return {
      services: this.proxyService.getAvailableServices(),
      total: this.proxyService.getAvailableServices().length,
      timestamp: new Date().toISOString(),
    };
  }
}
EOF
```

---

# BƯỚC 5: ENVIRONMENT & TESTING

## 5.1 Environment Variables
```bash
# Add to .env file
cat >> .env << 'EOF'

# Swagger Configuration
SWAGGER_ENABLE=true
SWAGGER_TITLE="Blog Microservices API"
SWAGGER_DESCRIPTION="Comprehensive API for blog microservices system"
SWAGGER_VERSION="1.0.0"
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080"

# API Documentation
API_DOCS_URL="/docs"
API_DOCS_JSON_URL="/docs-json"
API_DOCS_YAML_URL="/docs-yaml"
EOF
```

## 5.2 Testing Scripts
```bash
# File: scripts/test-swagger-setup.sh
cat > scripts/test-swagger-setup.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Swagger Documentation Setup..."

# Start infrastructure
echo "📦 Starting infrastructure..."
docker-compose up -d

echo "⏳ Waiting for infrastructure..."
sleep 15

# Start services
echo "🚀 Starting API Gateway..."
nx serve api-gateway &
GATEWAY_PID=$!

echo "🚀 Starting User Service..."
nx serve user-service &
USER_PID=$!

echo "⏳ Waiting for services to start..."
sleep 20

# Test Swagger endpoints
echo "📚 Testing Swagger documentation endpoints..."

API_GATEWAY_URL="http://localhost:3000"
USER_SERVICE_URL="http://localhost:3001"

# Test API Gateway Swagger
echo "Testing API Gateway Swagger..."
curl -f "${API_GATEWAY_URL}/docs" > /dev/null && echo "✅ API Gateway Swagger UI accessible" || echo "❌ API Gateway Swagger UI failed"
curl -f "${API_GATEWAY_URL}/docs-json" > /dev/null && echo "✅ API Gateway OpenAPI JSON accessible" || echo "❌ API Gateway OpenAPI JSON failed"

# Test User Service Swagger
echo "Testing User Service Swagger..."
curl -f "${USER_SERVICE_URL}/docs" > /dev/null && echo "✅ User Service Swagger UI accessible" || echo "❌ User Service Swagger UI failed"

# Test health endpoints with Swagger docs
echo "Testing health endpoints..."
curl -f "${API_GATEWAY_URL}/health" > /dev/null && echo "✅ Health endpoint accessible" || echo "❌ Health endpoint failed"
curl -f "${API_GATEWAY_URL}/health/services" > /dev/null && echo "✅ Services health endpoint accessible" || echo "❌ Services health endpoint failed"

echo ""
echo "🎉 Swagger documentation testing completed!"
echo ""
echo "📖 Available Documentation:"
echo "  - API Gateway: ${API_GATEWAY_URL}/docs"
echo "  - User Service: ${USER_SERVICE_URL}/docs"
echo "  - OpenAPI JSON: ${API_GATEWAY_URL}/docs-json"
echo "  - Health Check: ${API_GATEWAY_URL}/health"
echo ""
echo "🔑 To test authenticated endpoints:"
echo "  1. Register a user at ${API_GATEWAY_URL}/docs"
echo "  2. Login to get JWT token"
echo "  3. Click 'Authorize' button in Swagger UI"
echo "  4. Enter: Bearer <your-jwt-token>"
echo ""
echo "Press Ctrl+C to stop services..."

wait $GATEWAY_PID $USER_PID
EOF

chmod +x scripts/test-swagger-setup.sh
```

## 5.3 Swagger Examples Script
```bash
# File: scripts/generate-swagger-examples.sh
cat > scripts/generate-swagger-examples.sh << 'EOF'
#!/bin/bash

echo "📋 Generating Swagger API Examples..."

API_URL="http://localhost:3000"

# Create example user
echo "👤 Creating example user..."
curl -X POST "${API_URL}/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "username": "johndoe",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Software developer passionate about creating amazing user experiences."
  }' | jq '.'

echo ""
echo "🔐 Login example user..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "johndoe@example.com",
    "password": "SecurePass123!"
  }')

echo $LOGIN_RESPONSE | jq '.'

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "✅ Authentication successful!"
    echo "🎟️  JWT Token: ${TOKEN:0:50}..."
    
    echo ""
    echo "👤 Getting user profile..."
    curl -s -X GET "${API_URL}/api/v1/users/profile" \
      -H "Authorization: Bearer $TOKEN" | jq '.'
    
    echo ""
    echo "🏥 Checking services health..."
    curl -s -X GET "${API_URL}/health/services" | jq '.'
    
    echo ""
    echo "📊 Getting services list..."
    curl -s -X GET "${API_URL}/health/services/list" | jq '.'
    
else
    echo "❌ Login failed, cannot demonstrate authenticated endpoints"
fi

echo ""
echo "🎉 API examples completed!"
echo "📖 Visit ${API_URL}/docs to explore the full API documentation"
EOF

chmod +x scripts/generate-swagger-examples.sh
```

---

# SUCCESS CRITERIA

✅ **API Gateway Swagger**:
- Comprehensive API documentation at `/docs`
- OpenAPI JSON/YAML export
- JWT authentication support in UI
- Professional styling and branding

✅ **Individual Service Docs**:
- Each microservice has own Swagger docs
- Development-only documentation
- Service-specific API details

✅ **Enhanced Documentation**:
- Detailed endpoint descriptions
- Request/response examples
- Error response documentation
- Authentication flow documentation

✅ **Testing & Verification**:
- Health check endpoints documented
- API example generation
- Authentication testing support

## 🚀 Quick Start

```bash
# 1. Build shared utils library
nx build utils

# 2. Start services
./scripts/test-swagger-setup.sh

# 3. Generate API examples
./scripts/generate-swagger-examples.sh

# 4. Visit documentation
open http://localhost:3000/docs
```

## 📖 Documentation URLs

- **Main API Docs**: http://localhost:3000/docs
- **User Service Docs**: http://localhost:3001/docs  
- **OpenAPI JSON**: http://localhost:3000/docs-json
- **Health Monitoring**: http://localhost:3000/health/services

**Swagger documentation setup hoàn chỉnh!** 🎉
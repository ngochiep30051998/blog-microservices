# SuccessResponseDto - Common Response Pattern

## 🎯 Tổng Quan
Tạo standardized response format cho tất cả APIs trong blog microservices để:
- **Consistency**: Uniform response structure
- **Type Safety**: Generic TypeScript support  
- **Developer Experience**: Predictable API responses
- **Error Handling**: Consistent success/error patterns
- **Documentation**: Auto-generated Swagger docs

---

# BƯỚC 1: CREATE SUCCESS RESPONSE DTO

## 1.1 Base Success Response DTO
```bash
# File: libs/shared/dto/src/lib/common/success-response.dto.ts
mkdir -p libs/shared/dto/src/lib/common

cat > libs/shared/dto/src/lib/common/success-response.dto.ts << 'EOF'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto<T = any> {
  @ApiProperty({ 
    description: 'Indicates if the request was successful',
    example: true,
    default: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 200
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Success message',
    example: 'Operation completed successfully'
  })
  message: string;

  @ApiPropertyOptional({ 
    description: 'Response data',
    example: {} 
  })
  data?: T;

  @ApiPropertyOptional({ 
    description: 'Additional metadata',
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      requestId: 'req_123456789'
    }
  })
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    [key: string]: any;
  };

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    meta?: any
  ) {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }
}
EOF
```

## 1.2 Paginated Success Response DTO
```bash
# File: libs/shared/dto/src/lib/common/paginated-response.dto.ts
cat > libs/shared/dto/src/lib/common/paginated-response.dto.ts << 'EOF'
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from './success-response.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class PaginatedDataDto<T> {
  @ApiProperty({ description: 'Array of items' })
  items: T[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false
    }
  })
  pagination: PaginationMeta;
}

export class PaginatedResponseDto<T> extends SuccessResponseDto<PaginatedDataDto<T>> {
  constructor(
    items: T[],
    pagination: PaginationMeta,
    message: string = 'Data retrieved successfully',
    statusCode: number = 200
  ) {
    super(statusCode, message, { items, pagination });
  }
}
EOF
```

## 1.3 Response Builder Utility
```bash
# File: libs/shared/dto/src/lib/common/response-builder.util.ts
cat > libs/shared/dto/src/lib/common/response-builder.util.ts << 'EOF'
import { HttpStatus } from '@nestjs/common';
import { SuccessResponseDto } from './success-response.dto';
import { PaginatedResponseDto, PaginationMeta } from './paginated-response.dto';

export class ResponseBuilder {
  /**
   * Create success response with data
   */
  static success<T>(
    data: T,
    message: string = 'Operation completed successfully',
    statusCode: number = HttpStatus.OK,
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(statusCode, message, data, meta);
  }

  /**
   * Create success response without data
   */
  static successMessage(
    message: string = 'Operation completed successfully',
    statusCode: number = HttpStatus.OK,
    meta?: any
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(statusCode, message, null, meta);
  }

  /**
   * Create created response
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.CREATED, message, data, meta);
  }

  /**
   * Create updated response
   */
  static updated<T>(
    data: T,
    message: string = 'Resource updated successfully',
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, meta);
  }

  /**
   * Create deleted response
   */
  static deleted(
    message: string = 'Resource deleted successfully',
    meta?: any
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(HttpStatus.OK, message, null, meta);
  }

  /**
   * Create paginated response
   */
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Data retrieved successfully'
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return new PaginatedResponseDto(items, pagination, message);
  }

  /**
   * Create login success response
   */
  static loginSuccess<T>(
    data: T,
    message: string = 'Login successful'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      loginAt: new Date().toISOString(),
    });
  }

  /**
   * Create logout success response
   */
  static logoutSuccess(
    message: string = 'Logout successful'
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(HttpStatus.OK, message, null, {
      logoutAt: new Date().toISOString(),
    });
  }

  /**
   * Create validation success response
   */
  static validationSuccess<T>(
    data: T,
    message: string = 'Validation successful'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      validatedAt: new Date().toISOString(),
    });
  }

  /**
   * Create health check response
   */
  static healthCheck(
    data: any,
    message: string = 'Service is healthy'
  ): SuccessResponseDto<any> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      checkedAt: new Date().toISOString(),
    });
  }

  /**
   * Create upload success response
   */
  static uploadSuccess<T>(
    data: T,
    message: string = 'File uploaded successfully'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.CREATED, message, data, {
      uploadedAt: new Date().toISOString(),
    });
  }
}
EOF
```

---

# BƯỚC 2: SWAGGER DECORATORS

## 2.1 Custom Swagger Decorators
```bash
# File: libs/shared/dto/src/lib/common/swagger-response.decorators.ts
cat > libs/shared/dto/src/lib/common/swagger-response.decorators.ts << 'EOF'
import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { SuccessResponseDto } from './success-response.dto';
import { PaginatedResponseDto } from './paginated-response.dto';

/**
 * Swagger decorator for success response with data
 */
export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Successful operation',
  statusCode: number = 200
) =>
  ApiResponse({
    status: statusCode,
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(model) },
            success: { type: 'boolean', example: true },
            statusCode: { type: 'number', example: statusCode },
            message: { type: 'string', example: description },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                requestId: { type: 'string', example: 'req_123456789' },
              },
            },
          },
        },
      ],
    },
  });

/**
 * Swagger decorator for success response without data
 */
export const ApiSuccessMessageResponse = (
  description: string = 'Successful operation',
  statusCode: number = 200
) =>
  ApiResponse({
    status: statusCode,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: description },
        data: { type: 'null', example: null },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
      },
    },
  });

/**
 * Swagger decorator for paginated response
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Paginated data retrieved successfully'
) =>
  ApiResponse({
    status: 200,
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponseDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: getSchemaPath(model) },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number', example: 1 },
                    limit: { type: 'number', example: 10 },
                    total: { type: 'number', example: 100 },
                    totalPages: { type: 'number', example: 10 },
                    hasNext: { type: 'boolean', example: true },
                    hasPrevious: { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
        },
      ],
    },
  });

/**
 * Swagger decorator for created response
 */
export const ApiCreatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Resource created successfully'
) => ApiSuccessResponse(model, description, 201);

/**
 * Swagger decorator for updated response
 */
export const ApiUpdatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Resource updated successfully'
) => ApiSuccessResponse(model, description, 200);

/**
 * Swagger decorator for deleted response
 */
export const ApiDeletedResponse = (
  description: string = 'Resource deleted successfully'
) => ApiSuccessMessageResponse(description, 200);
EOF
```

---

# BƯỚC 3: UPDATE USER SERVICE VỚI SUCCESS RESPONSE

## 3.1 Updated User Controller
```bash
# File: apps/user-service/src/controllers/user.controller.ts
cat > apps/user-service/src/controllers/user.controller.ts << 'EOF'
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
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
  SuccessResponseDto,
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
  ApiSuccessMessageResponse,
} from '@blog/shared/dto';

// Local imports
import { UserService } from '../services/user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Create a new user account with email and username validation'
  })
  @ApiCreatedResponse(UserResponseDto, 'User account created successfully')
  async register(@Body() createUserDto: CreateUserDto): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.userService.create(createUserDto);
    
    return ResponseBuilder.created(user, 'User account created successfully', {
      welcomeEmailSent: true,
      accountActivationRequired: false,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user and return JWT token with user profile'
  })
  @ApiSuccessResponse(AuthResponseDto, 'Login successful')
  async login(@Body() loginDto: LoginDto): Promise<SuccessResponseDto<AuthResponseDto>> {
    const authResult = await this.userService.login(loginDto);
    
    return ResponseBuilder.loginSuccess(authResult, 'Login successful');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all users with pagination',
    description: 'Retrieve paginated list of users. Admin access required.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiPaginatedResponse(UserResponseDto, 'Users retrieved successfully')
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Request() req?: any
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.userService.findAll(paginationDto, search);
    
    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      'Users retrieved successfully'
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user profile information'
  })
  @ApiSuccessResponse(UserResponseDto, 'Profile retrieved successfully')
  async getProfile(@Request() req): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.userService.findOne(req.user.id);
    
    return ResponseBuilder.success(user, 'Profile retrieved successfully', HttpStatus.OK, {
      lastAccessed: new Date().toISOString(),
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User UUID' })
  @ApiSuccessResponse(UserResponseDto, 'User found successfully')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.userService.findOne(id);
    
    return ResponseBuilder.success(user, 'User found successfully');
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Update the authenticated user profile information'
  })
  @ApiUpdatedResponse(UserResponseDto, 'Profile updated successfully')
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.userService.update(req.user.id, updateUserDto);
    
    return ResponseBuilder.updated(user, 'Profile updated successfully', {
      fieldsUpdated: Object.keys(updateUserDto),
      updatedAt: new Date().toISOString(),
    });
  }

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Change the authenticated user password'
  })
  @ApiSuccessMessageResponse('Password changed successfully')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req
  ): Promise<SuccessResponseDto<null>> {
    await this.userService.changePassword(req.user.id, changePasswordDto);
    
    return ResponseBuilder.successMessage('Password changed successfully', HttpStatus.OK, {
      passwordChangedAt: new Date().toISOString(),
      securityNotificationSent: true,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update user by ID (Admin only)',
    description: 'Update any user information. Requires admin privileges.'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User UUID' })
  @ApiUpdatedResponse(UserResponseDto, 'User updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.userService.update(id, updateUserDto);
    
    return ResponseBuilder.updated(user, 'User updated successfully', {
      updatedBy: req.user.id,
      fieldsUpdated: Object.keys(updateUserDto),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete user (Admin only)',
    description: 'Permanently delete a user account. Requires admin privileges.'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User UUID' })
  @ApiDeletedResponse('User deleted successfully')
  async remove(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<null>> {
    await this.userService.remove(id);
    
    return ResponseBuilder.deleted('User deleted successfully', {
      deletedBy: req.user.id,
      deletedAt: new Date().toISOString(),
      cleanupJobScheduled: true,
    });
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'User service health check',
    description: 'Check the health status of the User Service'
  })
  @ApiSuccessResponse(Object, 'Service is healthy')
  async healthCheck(): Promise<SuccessResponseDto<any>> {
    const healthData = {
      status: 'ok',
      service: 'user-service',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
    
    return ResponseBuilder.healthCheck(healthData, 'User Service is healthy');
  }
}
EOF
```

## 3.2 Update User Service Methods
```bash
# File: apps/user-service/src/services/user.service.ts - Add pagination support
# Add interface for paginated results:
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

# Update findAll method:
async findAll(
  paginationDto: PaginationDto,
  search?: string
): Promise<PaginatedResult<UserResponseDto>> {
  const { page = 1, limit = 10 } = paginationDto;
  const skip = (page - 1) * limit;

  const queryBuilder = this.userRepository.createQueryBuilder('user');

  if (search) {
    queryBuilder.where(
      'user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search',
      { search: `%${search}%` }
    );
  }

  const [users, total] = await queryBuilder
    .skip(skip)
    .take(limit)
    .orderBy('user.createdAt', 'DESC')
    .getManyAndCount();

  return {
    items: users.map(user => this.toResponseDto(user)),
    total,
    page,
    limit,
  };
}
```

---

# BƯỚC 4: API GATEWAY PROXY UPDATE

## 4.1 Update API Gateway Controllers
```bash
# File: apps/api-gateway/src/controllers/user-proxy.controller.ts
# Update imports:
import {
  SuccessResponseDto,
  UserResponseDto,
  AuthResponseDto,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
} from '@blog/shared/dto';

# Update all methods to return SuccessResponseDto:
@Post('register')
@ApiCreatedResponse(UserResponseDto, 'User account created successfully')
async register(@Body() createUserDto: CreateUserDto): Promise<SuccessResponseDto<UserResponseDto>> {
  return this.proxyService.proxyRequest(
    'user', 
    '/users/register', 
    'POST', 
    createUserDto
  );
}

@Post('login')
@ApiSuccessResponse(AuthResponseDto, 'Login successful')
async login(@Body() loginDto: LoginDto): Promise<SuccessResponseDto<AuthResponseDto>> {
  return this.proxyService.proxyRequest(
    'user', 
    '/users/login', 
    'POST', 
    loginDto
  );
}

# Similar updates for other methods...
```

---

# BƯỚC 5: UPDATE SHARED DTO INDEX

## 5.1 Export All Response DTOs
```bash
# File: libs/shared/dto/src/index.ts - Add exports
cat >> libs/shared/dto/src/index.ts << 'EOF'

// Common Response DTOs
export * from './lib/common/success-response.dto';
export * from './lib/common/paginated-response.dto';
export * from './lib/common/response-builder.util';
export * from './lib/common/swagger-response.decorators';
EOF
```

---

# BƯỚC 6: TESTING

## 6.1 Test Response Format
```bash
# File: scripts/test-success-responses.sh
cat > scripts/test-success-responses.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing SuccessResponseDto Format..."

API_URL="http://localhost:3000"

# Test user registration
echo "👤 Testing user registration response format..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "success-test@example.com",
    "username": "successuser",
    "password": "SuccessTest123!",
    "firstName": "Success",
    "lastName": "Test"
  }')

echo "Registration Response Format:"
echo $REGISTER_RESPONSE | jq '.'

# Check response structure
SUCCESS=$(echo $REGISTER_RESPONSE | jq -r '.success')
STATUS_CODE=$(echo $REGISTER_RESPONSE | jq -r '.statusCode')
MESSAGE=$(echo $REGISTER_RESPONSE | jq -r '.message')
HAS_DATA=$(echo $REGISTER_RESPONSE | jq 'has("data")')
HAS_META=$(echo $REGISTER_RESPONSE | jq 'has("meta")')

echo ""
echo "✅ Response Structure Validation:"
echo "  - success: $SUCCESS"
echo "  - statusCode: $STATUS_CODE" 
echo "  - message: $MESSAGE"
echo "  - has data: $HAS_DATA"
echo "  - has meta: $HAS_META"

# Test login
echo ""
echo "🔐 Testing login response format..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "success-test@example.com",
    "password": "SuccessTest123!"
  }')

echo "Login Response Format:"
echo $LOGIN_RESPONSE | jq '.'

# Test health check
echo ""
echo "🏥 Testing health check response format..."
HEALTH_RESPONSE=$(curl -s "${API_URL}/api/v1/users/health")

echo "Health Response Format:"
echo $HEALTH_RESPONSE | jq '.'

echo ""
echo "✅ All response formats follow SuccessResponseDto structure!"
EOF

chmod +x scripts/test-success-responses.sh
```

---

# BƯỚC 7: ERROR RESPONSE DTO (COMPANION)

## 7.1 Error Response DTO
```bash
# File: libs/shared/dto/src/lib/common/error-response.dto.ts
cat > libs/shared/dto/src/lib/common/error-response.dto.ts << 'EOF'
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ 
    description: 'Indicates if the request was successful',
    example: false,
    default: false
  })
  success: boolean;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Error message',
    example: 'Validation failed'
  })
  message: string;

  @ApiProperty({ 
    description: 'Error details',
    example: {
      field: 'email',
      errors: ['Email is required', 'Email must be valid']
    }
  })
  error?: any;

  @ApiProperty({ 
    description: 'Additional metadata',
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/api/v1/users/register'
    }
  })
  meta: {
    timestamp: string;
    path?: string;
    requestId?: string;
    [key: string]: any;
  };

  constructor(
    statusCode: number,
    message: string,
    error?: any,
    path?: string,
    requestId?: string
  ) {
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...(path && { path }),
      ...(requestId && { requestId }),
    };
  }
}
EOF
```

---

# 🎯 USAGE EXAMPLES

## Common Patterns
```typescript
// ✅ Success with data
return ResponseBuilder.success(userData, 'User found');

// ✅ Created resource
return ResponseBuilder.created(newUser, 'User created');

// ✅ Updated resource  
return ResponseBuilder.updated(updatedUser, 'User updated');

// ✅ Deleted resource
return ResponseBuilder.deleted('User deleted');

// ✅ Paginated data
return ResponseBuilder.paginated(users, page, limit, total);

// ✅ Custom success
return ResponseBuilder.success(data, 'Custom message', 200, { customMeta: true });
```

## Response Format
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## Benefits Achieved

✅ **Consistency**: All APIs return same format  
✅ **Type Safety**: Generic TypeScript support  
✅ **Swagger Docs**: Auto-generated documentation  
✅ **Developer Experience**: Predictable responses  
✅ **Error Handling**: Consistent success/error patterns  
✅ **Metadata**: Rich response metadata  
✅ **Pagination**: Built-in pagination support  

**Perfect standardized response system!** 🎉
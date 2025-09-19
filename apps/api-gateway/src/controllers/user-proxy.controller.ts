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
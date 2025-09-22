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
  SuccessResponseDto,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
  ApiSuccessMessageResponse,
} from '@blog/shared/dto';

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
  async register(@Body() createUserDto: CreateUserDto): Promise<SuccessResponseDto<UserResponseDto>> {
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
  @ApiSuccessResponse(AuthResponseDto, 'Login successful')
  async login(@Body() loginDto: LoginDto): Promise<SuccessResponseDto<AuthResponseDto>> {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/login', 
      'POST', 
      loginDto
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all users (Admin only)',
    description: 'Retrieve paginated list of all users in the system. Requires admin privileges.'
  })
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
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Headers('authorization') auth?: string
  ): Promise<SuccessResponseDto<any>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user\'s profile information.'
  })
  @ApiSuccessResponse(UserResponseDto, 'Profile retrieved successfully')
  async getProfile(@Headers('authorization') auth: string): Promise<SuccessResponseDto<UserResponseDto>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieve a specific user\'s public profile information by their ID.'
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiSuccessResponse(UserResponseDto, 'User found')
  async findOne(
    @Param('id') id: string, 
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<UserResponseDto>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update current user profile',
    description: `
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
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiUpdatedResponse(UserResponseDto, 'Profile updated successfully')
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<UserResponseDto>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Change user password',
    description: `
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
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiSuccessMessageResponse('Password changed successfully')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto, 
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<null>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update user by ID (Admin only)',
    description: 'Update any user\'s information. Requires admin privileges.'
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiUpdatedResponse(UserResponseDto, 'User updated successfully')
  async update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<UserResponseDto>> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete user (Admin only)',
    description: `
Permanently delete a user account. Requires admin privileges.

**Warning:** This action is irreversible and will:
- Delete the user account permanently
- Remove all associated data
- Trigger cleanup events to other services
- Cannot be undone

**Alternative:** Consider deactivating the account instead.
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiDeletedResponse('User deleted successfully')
  async remove(
    @Param('id') id: string, 
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<null>> {
    return this.proxyService.proxyRequest(
      'user', 
      `/users/${id}`, 
      'DELETE', 
      null, 
      { authorization: auth }
    );
  }
}
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
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@blog/shared/auth';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
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
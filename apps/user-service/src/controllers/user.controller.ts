import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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
} from '@blog/shared/dto';

// Local imports
import { UserService } from '../services/user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully', 
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email or username already exists' 
  })
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    console.log('CreateUserDto:--------->', createUserDto);
    return this.userService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful', 
    type: AuthResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.userService.login(loginDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully' 
  })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto.page, paginationDto.limit);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved successfully', 
    type: UserResponseDto 
  })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.userService.findOne(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User found', 
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully', 
    type: UserResponseDto 
  })
  async updateProfile(
    @Request() req, 
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Current password is incorrect' 
  })
  async changePassword(
    @Request() req, 
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.userService.changePassword(req.user.id, changePasswordDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully', 
    type: UserResponseDto 
  })
  async update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully' 
  })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy' 
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-service',
    };
  }
}
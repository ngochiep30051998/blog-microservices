import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';

// Shared imports
import {
  CreateUserDto,
  LoginDto,
  UserResponseDto,
  AuthResponseDto,
  SuccessResponseDto,
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
} from '@blog/shared/dto';

// Local imports
import { AuthService } from '../services/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Create a new user account with email and username validation'
  })
  @ApiCreatedResponse(UserResponseDto, 'User account created successfully')
  async register(@Body() createUserDto: CreateUserDto): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.authService.register(createUserDto);
    
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
    const authResult = await this.authService.login(loginDto);
    
    return ResponseBuilder.loginSuccess(authResult, 'Login successful');
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Auth service health check',
    description: 'Check the health status of the Auth Service'
  })
  @ApiSuccessResponse(Object, 'Service is healthy')
  async healthCheck(): Promise<SuccessResponseDto<any>> {
    const healthData = {
      status: 'ok',
      service: 'auth-service',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
    
    return ResponseBuilder.healthCheck(healthData, 'Auth Service is healthy');
  }
}
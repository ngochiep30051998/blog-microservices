# Refactored Implementation: Sử Dụng Shared Libraries

## Tổng Quan Refactoring
- **@blog/shared/auth**: JWT strategies, guards, decorators
- **@blog/shared/dto**: Common DTOs cho User operations
- **User Service**: Business logic và entities
- **API Gateway**: Routing và proxy services

---

# BƯỚC 1: IMPLEMENT SHARED AUTH LIBRARY

## 1.1 Auth Library - JWT Strategy
```bash
# File: libs/shared/auth/src/lib/jwt.strategy.ts
cat > libs/shared/auth/src/lib/jwt.strategy.ts << 'EOF'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}
EOF
```

## 1.2 Auth Library - Guards
```bash
# File: libs/shared/auth/src/lib/jwt-auth.guard.ts
cat > libs/shared/auth/src/lib/jwt-auth.guard.ts << 'EOF'
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Access denied - Invalid or missing token');
    }
    return user;
  }
}
EOF

# File: libs/shared/auth/src/lib/roles.guard.ts
cat > libs/shared/auth/src/lib/roles.guard.ts << 'EOF'
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export enum UserRole {
  ADMIN = 'admin',
  AUTHOR = 'author',
  USER = 'user',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Access denied - Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
EOF

# File: libs/shared/auth/src/lib/roles.decorator.ts
cat > libs/shared/auth/src/lib/roles.decorator.ts << 'EOF'
import { SetMetadata } from '@nestjs/common';
import { UserRole } from './roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
EOF

# File: libs/shared/auth/src/lib/auth.module.ts
cat > libs/shared/auth/src/lib/auth.module.ts << 'EOF'
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: ['ConfigService'],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard, JwtModule],
})
export class SharedAuthModule {}
EOF
```

## 1.3 Update Auth Library Index
```bash
# File: libs/shared/auth/src/index.ts
cat > libs/shared/auth/src/index.ts << 'EOF'
export * from './lib/jwt.strategy';
export * from './lib/jwt-auth.guard';
export * from './lib/roles.guard';
export * from './lib/roles.decorator';
export * from './lib/auth.module';
EOF
```

---

# BƯỚC 2: IMPLEMENT SHARED DTO LIBRARY

## 2.1 User DTOs
```bash
# File: libs/shared/dto/src/lib/user/create-user.dto.ts
mkdir -p libs/shared/dto/src/lib/user

cat > libs/shared/dto/src/lib/user/create-user.dto.ts << 'EOF'
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@blog/shared/auth';

export class CreateUserDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address' 
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ 
    example: 'username123',
    description: 'Unique username',
    minLength: 3,
    maxLength: 50 
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  username: string;

  @ApiProperty({ 
    example: 'SecurePass123!',
    description: 'User password',
    minLength: 8 
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({ 
    example: 'John',
    description: 'User first name' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ 
    example: 'Doe',
    description: 'User last name' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ 
    example: 'Software developer passionate about technology',
    description: 'User bio' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ 
    enum: UserRole,
    example: UserRole.USER,
    description: 'User role' 
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
EOF

# File: libs/shared/dto/src/lib/user/update-user.dto.ts
cat > libs/shared/dto/src/lib/user/update-user.dto.ts << 'EOF'
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const)
) {}
EOF

# File: libs/shared/dto/src/lib/user/login.dto.ts
cat > libs/shared/dto/src/lib/user/login.dto.ts << 'EOF'
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'user@example.com or username123',
    description: 'Email address or username' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  identifier: string;

  @ApiProperty({ 
    example: 'SecurePass123!',
    description: 'User password' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
EOF

# File: libs/shared/dto/src/lib/user/change-password.dto.ts
cat > libs/shared/dto/src/lib/user/change-password.dto.ts << 'EOF'
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password',
    minLength: 8 
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
EOF

# File: libs/shared/dto/src/lib/user/user-response.dto.ts
cat > libs/shared/dto/src/lib/user/user-response.dto.ts << 'EOF'
import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@blog/shared/auth';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  username: string;

  @ApiProperty()
  @Expose()
  firstName?: string;

  @ApiProperty()
  @Expose()
  lastName?: string;

  @ApiProperty()
  @Expose()
  bio?: string;

  @ApiProperty()
  @Expose()
  avatar?: string;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  isEmailVerified: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Full name or username if no first/last name' })
  @Expose()
  @Transform(({ obj }) => {
    const fullName = `${obj.firstName || ''} ${obj.lastName || ''}`.trim();
    return fullName || obj.username;
  })
  fullName: string;

  // Exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  emailVerificationToken: string;

  @Exclude()
  passwordResetToken: string;

  @Exclude()
  passwordResetExpires: Date;
}
EOF

# File: libs/shared/dto/src/lib/user/auth-response.dto.ts
cat > libs/shared/dto/src/lib/user/auth-response.dto.ts << 'EOF'
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: string;

  @ApiProperty({ example: 86400, description: 'Token expiration time in seconds' })
  expires_in: number;
}
EOF
```

## 2.2 Common Response DTOs
```bash
# File: libs/shared/dto/src/lib/common/pagination.dto.ts
mkdir -p libs/shared/dto/src/lib/common

cat > libs/shared/dto/src/lib/common/pagination.dto.ts << 'EOF'
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ 
    default: 1,
    minimum: 1,
    description: 'Page number' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiPropertyOptional({ description: 'Array of items' })
  items: T[];

  @ApiPropertyOptional({ description: 'Total number of items' })
  total: number;

  @ApiPropertyOptional({ description: 'Current page number' })
  page: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  limit: number;

  @ApiPropertyOptional({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiPropertyOptional({ description: 'Whether there is a previous page' })
  hasPrevious: boolean;
}
EOF

# File: libs/shared/dto/src/lib/common/api-response.dto.ts
cat > libs/shared/dto/src/lib/common/api-response.dto.ts << 'EOF'
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  timestamp: string;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

export class SuccessResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(message: string, data?: T) {
    super(true, message, data);
  }
}

export class ErrorResponseDto extends ApiResponseDto {
  @ApiProperty()
  error?: any;

  constructor(message: string, error?: any) {
    super(false, message);
    this.error = error;
  }
}
EOF
```

## 2.3 Update DTO Library Index
```bash
# File: libs/shared/dto/src/index.ts
cat > libs/shared/dto/src/index.ts << 'EOF'
// User DTOs
export * from './lib/user/create-user.dto';
export * from './lib/user/update-user.dto';
export * from './lib/user/login.dto';
export * from './lib/user/change-password.dto';
export * from './lib/user/user-response.dto';
export * from './lib/user/auth-response.dto';

// Common DTOs
export * from './lib/common/pagination.dto';
export * from './lib/common/api-response.dto';
EOF
```

---

# BƯỚC 3: REFACTORED USER SERVICE

## 3.1 User Entity (Simplified)
```bash
# File: apps/user-service/src/entities/user.entity.ts
mkdir -p apps/user-service/src/entities

cat > apps/user-service/src/entities/user.entity.ts << 'EOF'
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@blog/shared/auth';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ length: 100, nullable: true })
  firstName?: string;

  @Column({ length: 100, nullable: true })
  lastName?: string;

  @Column({ text: true, nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;
}
EOF
```

## 3.2 User Service (Using Shared Libraries)
```bash
# File: apps/user-service/src/services/user.service.ts
mkdir -p apps/user-service/src/services

cat > apps/user-service/src/services/user.service.ts << 'EOF'
import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';

// Shared imports
import { UserRole } from '@blog/shared/auth';
import { KafkaService } from '@blog/shared/kafka';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  UserResponseDto,
  AuthResponseDto,
  PaginatedResponseDto
} from '@blog/shared/dto';

// Local imports
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private kafkaService: KafkaService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, username, password, ...userData } = createUserDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
      if (existingUser.username === username) {
        throw new ConflictException('Username already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      password: hashedPassword,
      ...userData,
    });

    const savedUser = await this.userRepository.save(user);

    // Publish user created event
    await this.publishUserEvent('user.created', savedUser);

    return this.toResponseDto(savedUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { identifier, password } = loginDto;

    // Find user by email or username
    const user = await this.userRepository.findOne({
      where: [
        { email: identifier },
        { username: identifier },
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Publish login event
    await this.publishUserEvent('user.login', user);

    return {
      user: this.toResponseDto(user),
      access_token,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResponseDto<UserResponseDto>> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: users.map(user => this.toResponseDto(user)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check username uniqueness if updating
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser) {
        throw new ConflictException('Username already exists');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    // Publish user updated event
    await this.publishUserEvent('user.updated', updatedUser);

    return this.toResponseDto(updatedUser);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;
    
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    
    await this.userRepository.save(user);

    // Publish password changed event
    await this.publishUserEvent('user.password_changed', user);

    return { message: 'Password changed successfully' };
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    const updatedUser = await this.userRepository.save(user);

    // Publish user deactivated event
    await this.publishUserEvent('user.deactivated', updatedUser);

    return this.toResponseDto(updatedUser);
  }

  async activate(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    const updatedUser = await this.userRepository.save(user);

    // Publish user activated event
    await this.publishUserEvent('user.activated', updatedUser);

    return this.toResponseDto(updatedUser);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    // Publish user deleted event
    await this.publishUserEvent('user.deleted', { 
      id, 
      email: user.email, 
      username: user.username 
    });

    return { message: 'User deleted successfully' };
  }

  private async publishUserEvent(eventType: string, userData: any): Promise<void> {
    try {
      await this.kafkaService.publishEvent('user.events', userData.id || 'system', {
        type: eventType,
        data: userData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to publish ${eventType} event:`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  private toResponseDto(user: User): UserResponseDto {
    return plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
EOF
```

## 3.3 User Controller (Using Shared Libraries)
```bash
# File: apps/user-service/src/controllers/user.controller.ts
mkdir -p apps/user-service/src/controllers

cat > apps/user-service/src/controllers/user.controller.ts << 'EOF'
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
EOF
```

## 3.4 User Service Module (Using Shared Libraries)
```bash
# File: apps/user-service/src/app/app.module.ts
cat > apps/user-service/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared imports
import { SharedKafkaModule } from '@blog/shared/kafka';
import { SharedAuthModule } from '@blog/shared/auth';

// Local imports
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'blog_user'),
        password: configService.get('POSTGRES_PASSWORD', 'blog_password_2024'),
        database: configService.get('POSTGRES_DB', 'blog_db'),
        entities: [User],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    SharedKafkaModule,
    SharedAuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class AppModule {}
EOF
```

---

# BƯỚC 4: REFACTORED API GATEWAY

## 4.1 API Gateway Module (Using Shared Auth)
```bash
# File: apps/api-gateway/src/app/app.module.ts
cat > apps/api-gateway/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Shared imports
import { SharedAuthModule } from '@blog/shared/auth';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { UserProxyController } from '../controllers/user-proxy.controller';
import { HealthController } from '../controllers/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    SharedAuthModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [AppController, UserProxyController, HealthController],
  providers: [
    AppService,
    MicroserviceProxyService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
EOF
```

## 4.2 User Proxy Controller (Using Shared DTOs and Auth)
```bash
# File: apps/api-gateway/src/controllers/user-proxy.controller.ts
mkdir -p apps/api-gateway/src/controllers

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Users')
@Controller('users')
export class UserProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

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
  async register(@Body() createUserDto: CreateUserDto) {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/register', 
      'POST', 
      createUserDto
    );
  }

  @Post('login')
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
  async login(@Body() loginDto: LoginDto) {
    return this.proxyService.proxyRequest(
      'user', 
      '/users/login', 
      'POST', 
      loginDto
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully' 
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Headers('authorization') auth?: string
  ) {
    return this.proxyService.proxyRequest(
      'user', 
      '/users', 
      'GET', 
      null, 
      { authorization: auth }, 
      paginationDto
    );
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
  async getProfile(@Headers('authorization') auth: string) {
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
  async findOne(
    @Param('id') id: string, 
    @Headers('authorization') auth: string
  ) {
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully', 
    type: UserResponseDto 
  })
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ) {
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
    @Body() updateUserDto: UpdateUserDto, 
    @Headers('authorization') auth: string
  ) {
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully' 
  })
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

# BƯỚC 5: TESTING SCRIPTS

## 5.1 Build và Test Script
```bash
cat > scripts/test-refactored-services.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Refactored Services with Shared Libraries..."

# Build shared libraries first
echo "🔨 Building shared libraries..."
nx build auth
nx build dto  
nx build kafka
nx build config

if [ $? -ne 0 ]; then
    echo "❌ Shared libraries build failed"
    exit 1
fi

# Build services
echo "🔨 Building User Service..."
nx build user-service

echo "🔨 Building API Gateway..."
nx build api-gateway

if [ $? -ne 0 ]; then
    echo "❌ Services build failed"
    exit 1
fi

echo "✅ All builds successful!"

# Start infrastructure
echo "📦 Starting infrastructure..."
docker-compose up -d

echo "⏳ Waiting for infrastructure..."
sleep 15

# Start services
echo "🚀 Starting services..."
nx serve user-service &
USER_PID=$!

nx serve api-gateway &
GATEWAY_PID=$!

echo "⏳ Waiting for services to start..."
sleep 20

# Test endpoints
echo "🏥 Testing health endpoints..."
curl -f http://localhost:9001/users/health && echo " ✅ User Service OK"
curl -f http://localhost:9000/health && echo " ✅ API Gateway OK"

echo ""
echo "📖 API Documentation: http://localhost:9000/docs"
echo "🚀 Services are running!"
echo "Press Ctrl+C to stop..."

wait $USER_PID $GATEWAY_PID
EOF

chmod +x scripts/test-refactored-services.sh
```

## 5.2 API Test Script
```bash
cat > scripts/test-api-endpoints.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing API Endpoints..."

API_URL="http://localhost:9000"

# Test user registration
echo "👤 Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "bio": "I am a test user"
  }')

echo "Registration response: $REGISTER_RESPONSE"

# Test user login
echo "🔐 Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser@example.com",
    "password": "TestPass123!"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

echo "🎟️ Got auth token: ${TOKEN:0:50}..."

# Test get profile
echo "👤 Testing get profile..."
curl -s -X GET ${API_URL}/users/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "✅ API testing completed!"
echo "🔑 Your auth token: $TOKEN"
EOF

chmod +x scripts/test-api-endpoints.sh
```

---

# SUCCESS CRITERIA

✅ **Shared Libraries:**
- Auth library với JWT strategy, guards, roles
- DTO library với validation và Swagger docs
- Clean separation of concerns

✅ **Code Reuse:**
- No duplicate authentication logic
- Consistent DTOs across services  
- Shared interfaces and types

✅ **User Service:**
- Uses shared auth and DTO libraries
- Clean business logic separation
- Kafka event publishing

✅ **API Gateway:**
- Uses shared auth for validation
- Consistent API documentation
- Proper request forwarding

**Bây giờ bạn có architecture clean với shared libraries!** 🎉

Chạy test scripts để verify implementation:
```bash
./scripts/test-refactored-services.sh
./scripts/test-api-endpoints.sh
```
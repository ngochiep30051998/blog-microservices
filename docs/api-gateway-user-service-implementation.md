# Implementation Guide: API Gateway + User Service

## Tổng Quan Implementation
- **API Gateway**: Entry point, authentication, routing, rate limiting, Swagger docs
- **User Service**: User CRUD, JWT authentication, password hashing, Kafka events
- **Database**: PostgreSQL với TypeORM
- **Security**: JWT tokens, bcrypt passwords, role-based access

---

# BƯỚC 1: IMPLEMENT USER SERVICE

## 1.1 Install Dependencies cho User Service
```bash
cd apps/user-service
npm install @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/bcrypt @types/passport-jwt
```

## 1.2 User Entity
```bash
# Tạo entities folder
mkdir -p apps/user-service/src/entities

cat > apps/user-service/src/entities/user.entity.ts << 'EOF'
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  AUTHOR = 'author',
  USER = 'user',
}

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

## 1.3 DTOs (Data Transfer Objects)
```bash
mkdir -p apps/user-service/src/dto

# Create User DTO
cat > apps/user-service/src/dto/create-user.dto.ts << 'EOF'
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ example: 'username123' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  username: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Software developer passionate about technology' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
EOF

# Update User DTO
cat > apps/user-service/src/dto/update-user.dto.ts << 'EOF'
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const)
) {}
EOF

# Login DTO
cat > apps/user-service/src/dto/login.dto.ts << 'EOF'
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or username123' })
  @IsString()
  @IsNotEmpty()
  identifier: string; // email or username

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
EOF

# Change Password DTO
cat > apps/user-service/src/dto/change-password.dto.ts << 'EOF'
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
EOF

# User Response DTO
cat > apps/user-service/src/dto/user-response.dto.ts << 'EOF'
import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

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

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => `${obj.firstName || ''} ${obj.lastName || ''}`.trim() || obj.username)
  fullName: string;

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
```

## 1.4 User Service Implementation
```bash
mkdir -p apps/user-service/src/services

cat > apps/user-service/src/services/user.service.ts << 'EOF'
import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { KafkaService } from '@blog/shared/kafka';
import { plainToClass } from 'class-transformer';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: UserResponseDto;
  access_token: string;
  token_type: string;
  expires_in: number;
}

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

  async login(loginDto: LoginDto): Promise<AuthResponse> {
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
    const payload: JwtPayload = {
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

  async findAll(page: number = 1, limit: number = 10): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users: users.map(user => this.toResponseDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    await this.publishUserEvent('user.deleted', { id, email: user.email, username: user.username });

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

## 1.5 Auth Strategy và Guards
```bash
mkdir -p apps/user-service/src/auth

cat > apps/user-service/src/auth/jwt.strategy.ts << 'EOF'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService, JwtPayload } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Verify user still exists and is active
    const user = await this.userService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
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

cat > apps/user-service/src/auth/jwt-auth.guard.ts << 'EOF'
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
      throw err || new UnauthorizedException('Access denied');
    }
    return user;
  }
}
EOF

cat > apps/user-service/src/auth/roles.guard.ts << 'EOF'
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';

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
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
EOF

cat > apps/user-service/src/auth/roles.decorator.ts << 'EOF'
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
EOF
```

## 1.6 User Controller
```bash
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
  ParseIntPipe,
  DefaultValuePipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.userService.findAll(page, limit);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully', type: UserResponseDto })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.userService.findOne(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: UserResponseDto })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, changePasswordDto);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully', type: UserResponseDto })
  async deactivate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.deactivate(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully', type: UserResponseDto })
  async activate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.activate(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
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

## 1.7 User Module
```bash
cat > apps/user-service/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SharedKafkaModule } from '@blog/shared/kafka';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

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
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    SharedKafkaModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [UserService],
})
export class AppModule {}
EOF
```

---

# BƯỚC 2: IMPLEMENT API GATEWAY

## 2.1 Install Dependencies cho API Gateway
```bash
cd apps/api-gateway
npm install @nestjs/swagger swagger-ui-express helmet express-rate-limit @nestjs/axios axios
npm install -D @types/express-rate-limit
```

## 2.2 Proxy Service cho API Gateway
```bash
mkdir -p apps/api-gateway/src/services

cat > apps/api-gateway/src/services/microservice-proxy.service.ts << 'EOF'
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

export interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
}

@Injectable()
export class MicroserviceProxyService {
  private readonly logger = new Logger(MicroserviceProxyService.name);
  private readonly services: Map<string, ServiceConfig>;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.services = new Map([
      ['user', {
        name: 'User Service',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:3001'),
        timeout: 10000,
      }],
      ['post', {
        name: 'Post Service',
        url: this.configService.get('POST_SERVICE_URL', 'http://localhost:3002'),
        timeout: 10000,
      }],
      ['comment', {
        name: 'Comment Service',
        url: this.configService.get('COMMENT_SERVICE_URL', 'http://localhost:3003'),
        timeout: 10000,
      }],
      ['notification', {
        name: 'Notification Service',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3004'),
        timeout: 10000,
      }],
      ['analytics', {
        name: 'Analytics Service',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:3005'),
        timeout: 10000,
      }],
    ]);
  }

  async proxyRequest(
    service: string,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any,
    headers?: Record<string, string>,
    params?: Record<string, any>,
  ): Promise<any> {
    const serviceConfig = this.services.get(service);
    
    if (!serviceConfig) {
      throw new HttpException(
        `Service ${service} not found`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${serviceConfig.url}${path}`;
    
    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: serviceConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      config.data = data;
    }

    if (params) {
      config.params = params;
    }

    try {
      this.logger.log(`Proxying ${method} ${url}`);
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.request(config)
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Proxy request failed for ${service}${path}:`, error.message);
      
      if (error.response) {
        throw new HttpException(
          error.response.data,
          error.response.status,
        );
      } else if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          `${serviceConfig.name} is unavailable`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED') {
        throw new HttpException(
          `${serviceConfig.name} timeout`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async healthCheck(): Promise<Record<string, any>> {
    const healthChecks = {};

    for (const [serviceName, config] of this.services.entries()) {
      try {
        const response = await this.proxyRequest(serviceName, '/health', 'GET');
        healthChecks[serviceName] = {
          status: 'healthy',
          url: config.url,
          response,
        };
      } catch (error) {
        healthChecks[serviceName] = {
          status: 'unhealthy',
          url: config.url,
          error: error.message,
        };
      }
    }

    return healthChecks;
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }
}
EOF
```

## 2.3 User Proxy Controller
```bash
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
  Request,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('api/users')
export class UserProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async register(@Body() createUserDto: any) {
    return this.proxyService.proxyRequest('user', '/users/register', 'POST', createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: any) {
    return this.proxyService.proxyRequest('user', '/users/login', 'POST', loginDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query() query: any, @Headers('authorization') auth?: string) {
    return this.proxyService.proxyRequest('user', '/users', 'GET', null, { authorization: auth }, query);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', '/users/profile', 'GET', null, { authorization: auth });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', `/users/${id}`, 'GET', null, { authorization: auth });
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Body() updateUserDto: any, @Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', '/users/profile', 'PATCH', updateUserDto, { authorization: auth });
  }

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@Body() changePasswordDto: any, @Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', '/users/profile/change-password', 'PATCH', changePasswordDto, { authorization: auth });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  async update(@Param('id') id: string, @Body() updateUserDto: any, @Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', `/users/${id}`, 'PATCH', updateUserDto, { authorization: auth });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  async remove(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.proxyService.proxyRequest('user', `/users/${id}`, 'DELETE', null, { authorization: auth });
  }
}
EOF
```

## 2.4 Health Controller
```bash
cat > apps/api-gateway/src/controllers/health.controller.ts << 'EOF'
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Get()
  @ApiOperation({ summary: 'API Gateway health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Check all microservices health' })
  @ApiResponse({ status: 200, description: 'Services health status' })
  async servicesHealth() {
    const services = await this.proxyService.healthCheck();
    
    const overallStatus = Object.values(services).every(
      (service: any) => service.status === 'healthy'
    ) ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
EOF
```

## 2.5 JWT Strategy cho API Gateway
```bash
mkdir -p apps/api-gateway/src/auth

cat > apps/api-gateway/src/auth/jwt.strategy.ts << 'EOF'
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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
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

cat > apps/api-gateway/src/auth/jwt-auth.guard.ts << 'EOF'
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
      throw err || new UnauthorizedException('Access denied');
    }
    return user;
  }
}
EOF
```

## 2.6 API Gateway Main Module
```bash
cat > apps/api-gateway/src/app/app.module.ts << 'EOF'
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { UserProxyController } from '../controllers/user-proxy.controller';
import { HealthController } from '../controllers/health.controller';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [AppController, UserProxyController, HealthController],
  providers: [AppService, MicroserviceProxyService, JwtStrategy, JwtAuthGuard],
})
export class AppModule {}
EOF
```

## 2.7 API Gateway Main File
```bash
cat > apps/api-gateway/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middlewares
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
  }));

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Blog Microservices API')
    .setDescription('API Gateway for Blog Microservices Architecture')
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
    .addServer('http://localhost:3000', 'Development server')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Blog API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  const port = configService.get('API_GATEWAY_PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📊 Swagger docs available at http://localhost:${port}/docs`);
  console.log(`🏥 Health check at http://localhost:${port}/health`);
}

bootstrap();
EOF
```

---

# BƯỚC 3: TESTING VÀ VERIFICATION

## 3.1 Update Environment Variables
```bash
# Thêm vào .env file
cat >> .env << 'EOF'

# Service URLs (for API Gateway)
USER_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
COMMENT_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3005

# JWT Configuration (nếu chưa có)
JWT_SECRET=super-secret-jwt-key-2024-blog-microservices
JWT_EXPIRES_IN=24h
EOF
```

## 3.2 Build and Test Scripts
```bash
cat > scripts/test-user-service.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing User Service Implementation..."

# Build user service
echo "🔨 Building User Service..."
nx build user-service
if [ $? -ne 0 ]; then
    echo "❌ User Service build failed"
    exit 1
fi

# Build API Gateway
echo "🔨 Building API Gateway..."
nx build api-gateway
if [ $? -ne 0 ]; then
    echo "❌ API Gateway build failed"
    exit 1
fi

echo "✅ All builds successful!"

# Start infrastructure if not running
echo "📦 Checking infrastructure..."
docker-compose ps | grep -q "Up" || docker-compose up -d

echo "⏳ Waiting for infrastructure to be ready..."
sleep 10

# Start services
echo "🚀 Starting User Service..."
nx serve user-service &
USER_PID=$!

echo "🚀 Starting API Gateway..."
nx serve api-gateway &
GATEWAY_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Test health endpoints
echo "🏥 Testing health endpoints..."
curl -f http://localhost:3001/users/health || echo "❌ User Service health check failed"
curl -f http://localhost:3000/health || echo "❌ API Gateway health check failed"

# Test user registration
echo "👤 Testing user registration..."
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }' || echo "❌ User registration failed"

echo "🎉 Testing completed!"
echo "🔍 Check logs above for any errors"
echo "📖 API Documentation: http://localhost:3000/docs"

# Keep services running
echo "Services are running. Press Ctrl+C to stop..."
wait $USER_PID $GATEWAY_PID
EOF

chmod +x scripts/test-user-service.sh
```

## 3.3 Run Tests
```bash
# Test the implementation
./scripts/test-user-service.sh
```

## 3.4 API Testing Commands
```bash
# Register a new user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get profile (replace TOKEN with actual JWT token)
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

# SUCCESS CRITERIA

✅ **User Service Features:**
- User registration with validation
- JWT authentication and login
- User CRUD operations
- Password change functionality
- Role-based access control
- Kafka event publishing
- PostgreSQL integration with TypeORM

✅ **API Gateway Features:**
- Request routing to microservices
- JWT token validation
- Rate limiting and security
- Swagger documentation
- Health checks for all services
- CORS and helmet security

✅ **Infrastructure Integration:**
- PostgreSQL database connection
- Kafka event publishing
- Proper error handling
- Request/response transformation

**Bạn đã có một User Service và API Gateway hoàn chỉnh!** 🎉

Chạy test script và báo kết quả để chúng ta tiếp tục với Post Service ở bước tiếp theo!
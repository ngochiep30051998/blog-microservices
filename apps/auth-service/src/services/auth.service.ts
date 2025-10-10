import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';

// Shared imports
import { KafkaService } from '@blog/shared/kafka';
import {
  CreateUserDto,
  LoginDto,
  UserResponseDto,
  AuthResponseDto,
} from '@blog/shared/dto';

// Import User entity from user-service (shared database)
import { User } from '../../../user-service/src/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private kafkaService: KafkaService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
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

    const accessToken = this.jwtService.sign(payload);

    // Publish login event
    await this.publishUserEvent('user.login', user);

    return {
      user: this.toResponseDto(user),
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
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
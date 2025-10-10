import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';

// Shared imports
import { KafkaService } from '@blog/shared/kafka';
import {
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  PaginationDto
} from '@blog/shared/dto';

// Local imports
import { User } from '../entities/user.entity';

// Interface for paginated results
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private kafkaService: KafkaService,
  ) {}



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
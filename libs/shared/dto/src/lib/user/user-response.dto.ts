import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../common/enums';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiProperty()
  @Expose()
  username!: string;

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
  role!: UserRole;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  isEmailVerified!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiProperty()
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => `${obj.firstName || ''} ${obj.lastName || ''}`.trim() || obj.username)
  fullName!: string;

  @Exclude()
  password!: string;

  @Exclude()
  emailVerificationToken!: string;

  @Exclude()
  passwordResetToken!: string;

  @Exclude()
  passwordResetExpires!: Date;
}
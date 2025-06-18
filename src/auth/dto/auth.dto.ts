import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsUUID,
  IsEnum,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiPropertyOptional({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token?: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid-string' },
      email: { type: 'string', example: 'user@example.com' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
      role: { type: 'string', example: 'employee' },
      clientId: { type: 'string', example: 'uuid-string' },
      provider: { type: 'string', example: 'google' },
    },
  })
  user: {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    clientId?: string;
    provider: string;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Login successful',
  })
  message: string;
}

export class GoogleProfileDto {
  @ApiProperty({ description: 'Google user ID', example: '1234567890' })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User profile picture URL',
    example: 'https://lh3.googleusercontent.com/...',
  })
  picture?: string;

  @ApiPropertyOptional({ description: 'Google access token' })
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Google refresh token' })
  refreshToken?: string;
}

export class SignupSuperAdminDto {
  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'admin@accurack.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @MinLength(8)
  password: string;
}

export class InviteDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'employee@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Store ID to invite user to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  storeId: string;

  @ApiProperty({
    description: 'Role to assign to the user',
    enum: Role,
    example: 'employee',
  })
  @IsEnum(Role)
  role: Role;
}

export class AcceptInviteDto {
  @ApiProperty({ description: 'User first name', example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Smith' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Invitation token',
    example: 'abc123def456ghi789',
  })
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token', example: 'abc123def456' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @MinLength(8)
  password: string;
}

export class UserProfileDto {
  @ApiProperty({ description: 'User ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'User role', example: 'employee' })
  role: string;

  @ApiProperty({ description: 'Client ID', example: 'uuid-string' })
  clientId: string;

  @ApiProperty({ description: 'User status', example: 'active' })
  status: string;

  @ApiPropertyOptional({
    description: 'Google ID if linked',
    example: '1234567890',
  })
  googleId?: string;

  @ApiPropertyOptional({
    description: 'Google access token',
    example: 'ya29.a0...',
  })
  googleAccessToken?: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2025-06-18T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-06-18T10:30:00.000Z',
  })
  updatedAt: Date;
}

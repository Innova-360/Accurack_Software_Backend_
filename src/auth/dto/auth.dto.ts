import { IsEmail, IsNotEmpty, MinLength, IsUUID, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class SignupSuperAdminDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

export class InviteDto {
  @IsEmail()
  email: string;

  @IsUUID()
  storeId: string;

  @IsEnum(Role)
  role: Role;
}

export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  token: string;

  @MinLength(8)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @MinLength(8)
  password: string;
}
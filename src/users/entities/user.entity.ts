export class User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  provider: 'google' | 'manual';
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Manual auth fields (for your friend's system)
  password?: string; // Only for manual registration
  username?: string;
}

export class GoogleUserDto {
  email: string;
  name: string;
  picture?: string;
  googleId: string;
}

export class CreateUserDto {
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  provider: 'google' | 'manual';
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
  password?: string;
  username?: string;
}

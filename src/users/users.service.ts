import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  // In-memory storage for now (replace with database later)
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((user) => user.email === email);
    return user || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = this.users.find((user) => user.googleId === googleId);
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((user) => user.id === id);
    return user || null;
  }
  async createUser(createUserDto: Partial<User>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: createUserDto.email!,
      name: createUserDto.name!,
      picture: createUserDto.picture,
      googleId: createUserDto.googleId,
      provider: createUserDto.provider || 'manual',
      createdAt: new Date(),
    };

    this.users.push(user);
    return user;
  }
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
    };

    return this.users[userIndex];
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }
  // Method to find or create user from Google profile
  async findOrCreateGoogleUser(googleProfile: any): Promise<User> {
    let user = await this.findByGoogleId(googleProfile.id);

    if (!user) {
      // Check if user exists with same email from manual registration
      user = await this.findByEmail(googleProfile.emails[0].value);

      if (user) {
        // Link Google account to existing manual account
        user = await this.updateUser(user.id, {
          googleId: googleProfile.id,
          picture: googleProfile.photos?.[0]?.value,
        });
      } else {
        // Create new user
        user = await this.createUser({
          email: googleProfile.emails[0].value,
          name: googleProfile.displayName,
          picture: googleProfile.photos?.[0]?.value,
          googleId: googleProfile.id,
          provider: 'google',
        });
      }
    }

    return user!;
  }
}

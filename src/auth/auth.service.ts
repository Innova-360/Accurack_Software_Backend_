import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleProfileDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async googleLogin(googleUser: GoogleProfileDto): Promise<AuthResponseDto> {
    const payload = {
      sub: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      provider: 'google',
      role: 'USER', // Default role for Google users
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        provider: 'google',
      },
      message: 'Google authentication successful',
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}

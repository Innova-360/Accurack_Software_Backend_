import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleProfileDto } from '../dto/auth.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    // Validate required environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      throw new Error(
        'GOOGLE_CLIENT_ID environment variable is required for Google OAuth',
      );
    }

    if (!clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET environment variable is required for Google OAuth',
      );
    }

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user: GoogleProfileDto = {
      id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      picture: photos[0]?.value,
    };

    done(null, user);
  }
}

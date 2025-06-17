export class AuthResponseDto {
  access_token: string;
  user: {
    email: string;
    name: string;
    picture?: string;
    provider: string;
  };
  message: string;
}

export class GoogleProfileDto {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

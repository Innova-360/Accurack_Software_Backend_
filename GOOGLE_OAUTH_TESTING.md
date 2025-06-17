# Google OAuth Implementation - Testing Guide

## 🚀 Quick Start

Your Google OAuth implementation is ready! Here's how to test it:

### 1. Start the Server

```bash
npm run start:dev
```

### 2. Test Google OAuth Flow

#### Option A: Browser Testing (Recommended)

1. Open your browser
2. Navigate to: `http://localhost:3000/auth/google`
3. Sign in with your Google account
4. You'll be redirected back with a JWT token response

#### Option B: Get Testing Instructions

Visit: `http://localhost:3000/test/google-auth-flow` for detailed instructions

## 📋 Available Endpoints

| Method | Endpoint                 | Description                         |
| ------ | ------------------------ | ----------------------------------- |
| GET    | `/auth/google`           | Start Google OAuth flow             |
| GET    | `/auth/google/callback`  | OAuth callback (automatic)          |
| GET    | `/auth/profile`          | Test protected route (requires JWT) |
| GET    | `/auth/logout`           | Logout instruction                  |
| GET    | `/test/google-auth-flow` | Testing instructions                |

## 🔧 Testing Protected Routes

After getting your JWT token:

1. Copy the `access_token` from the OAuth response
2. Test protected route using curl or Postman:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/auth/profile
```

## 📝 Response Format

### Successful Google Login:

```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/...",
    "provider": "google"
  },
  "message": "Google authentication successful"
}
```

### Protected Route Response:

```json
{
  "message": "This is a protected route",
  "user": {
    "id": "google_user_id",
    "email": "user@gmail.com",
    "name": "John Doe",
    "provider": "google"
  }
}
```

## 🔑 Key Features

- ✅ **No Database Required**: Uses JWT tokens only
- ✅ **Easy Testing**: Works without frontend
- ✅ **Class-based DTOs**: Modern TypeScript approach
- ✅ **Ready for Integration**: Compatible with manual auth systems
- ✅ **Secure**: JWT tokens with expiration
- ✅ **Simple Logout**: Client-side token removal

## 🔧 Environment Variables

Make sure these are set in your `.env` file:

```env
GOOGLE_CLIENT_ID=622044624343-0n0754c6qhcfpdvp3rphcmdt8suolc8d.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your_jwt_secret_key
```

## 🤝 Integration with Manual Auth

When your friend implements manual authentication:

- Both systems will use the same JWT structure
- Same protected routes work for both auth methods
- Same logout process
- Easy to merge user management systems later

## 🚫 Logout Process

Since we're using JWT tokens (stateless), logout is handled client-side:

1. Call `/auth/logout` for instructions
2. Remove JWT token from client storage
3. Token will expire automatically (24 hours)

## 🐛 Troubleshooting

1. **Google Console Setup**: Make sure redirect URI is exactly `http://localhost:3000/auth/google/callback`
2. **Environment Variables**: Ensure all Google OAuth credentials are correct
3. **Port**: Make sure the app is running on port 3000
4. **CORS**: If testing from browser, make sure CORS is properly configured

Start the server and test it out! 🎉

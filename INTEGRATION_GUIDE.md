# 🔗 Google OAuth + Manual Auth Integration Guide

## 📁 Current Structure (Ready for Integration)

```
src/
├── guards/ (GLOBAL - matches your friend's structure)
│   ├── jwt-auth.guard.ts
│   ├── google-oauth.guard.ts
│   └── roles.guard.ts
├── decorators/ (GLOBAL - matches your friend's structure)
│   ├── roles.decorator.ts
│   └── public.decorator.ts
├── auth/
│   ├── strategies/
│   │   ├── jwt.strategy.ts (compatible with manual auth)
│   │   └── google.strategy.ts
│   ├── dto/
│   │   └── auth.dto.ts
│   ├── auth.controller.ts (Google OAuth endpoints)
│   ├── auth.service.ts (Google OAuth logic)
│   └── auth.module.ts
└── users/
    ├── entities/
    │   └── user.entity.ts (Prisma compatible)
    └── users.service.ts
```

## 🤝 Integration Steps When Merging

### 1. **Merge Guards Folder**

- Your friend's guards + our Google OAuth guards
- Both should use the same JWT strategy
- Keep role-based guards from your friend

### 2. **Merge Decorators Folder**

- Your friend's role decorators + our Public decorator
- Use the same role enum values

### 3. **Merge Auth Controllers**

Your friend's auth controller should have:

```typescript
// Manual login/signup routes
@Post('login')
@Post('signup')
@Post('forgot-password')

// Our Google OAuth routes
@Get('google')
@Get('google/callback')
```

### 4. **Merge Auth Services**

Combine both services or keep separate:

```typescript
// Your friend's manual auth methods
async login(loginDto)
async signup(signupDto)
async validateUser(email, password)

// Our Google OAuth methods
async googleLogin(googleUser)
async validateToken(token)
```

### 5. **Unified JWT Strategy**

Both auth methods should produce compatible JWT tokens:

```typescript
{
  sub: userId,
  email: user.email,
  name: user.name,
  role: user.role,
  provider: 'manual' | 'google'
}
```

## 🔄 Database Integration with Prisma

### User Schema (for your friend's Prisma schema)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  username      String?  @unique
  password      String?  // null for Google users
  picture       String?
  googleId      String?  @unique
  provider      Provider @default(MANUAL)
  role          Role     @default(USER)
  isEmailVerified Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Provider {
  MANUAL
  GOOGLE
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## 🚀 Benefits After Integration

### ✅ Unified Authentication

- Same JWT tokens for both auth methods
- Same logout process
- Same protected routes

### ✅ Role-Based Access Control

- Works for both Google and manual users
- Same decorators: `@Roles(Role.ADMIN)`
- Same guards: `@UseGuards(JwtAuthGuard, RolesGuard)`

### ✅ Database Compatibility

- Google users stored in same table
- Easy user management
- Account linking possible (same email, different providers)

## 🧪 Testing Both Auth Methods

### Manual Auth (your friend's)

```bash
POST /auth/login
POST /auth/signup
```

### Google OAuth (ours)

```bash
GET /auth/google
# -> redirects to Google
# -> returns to /auth/google/callback with JWT
```

### Protected Routes (both)

```bash
GET /auth/profile
Authorization: Bearer JWT_TOKEN
```

## 📋 Merge Checklist

- [ ] Copy guards to global guards folder
- [ ] Copy decorators to global decorators folder
- [ ] Merge auth controllers (manual + Google routes)
- [ ] Merge auth services (manual + Google methods)
- [ ] Update Prisma schema with Google fields
- [ ] Test both auth flows
- [ ] Verify JWT tokens work for both
- [ ] Test role-based access control

## 🔧 Configuration

### Environment Variables

```env
# Manual Auth (your friend's)
DATABASE_URL="postgresql://..."
JWT_SECRET="shared-secret-key"

# Google OAuth (ours)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

## 🎯 Final Result

After integration, your app will support:

- ✅ Manual signup/login (your friend's work)
- ✅ Google OAuth signin (our work)
- ✅ Same JWT tokens for both
- ✅ Same role system for both
- ✅ Same protected routes for both
- ✅ Unified user database

**Ready for seamless merge! 🚀**

# 🐳 Docker Setup for Accurack Backend

This directory contains Docker configurations optimized for both development and production environments, specifically tuned for AWS EC2 t2.micro instances with RDS.

## 📁 Files Overview

- **`Dockerfile.dev`** - Development environment with hot reload
- **`Dockerfile.prod`** - Production-optimized multi-stage build
- **`docker-compose.dev.yml`** - Local development with PostgreSQL
- **`docker-compose.prod.yml`** - Production deployment
- **`docker-entrypoint.sh`** - Startup script with Prisma migrations
- **`.dockerignore`** - Exclude unnecessary files from builds
- **`.env.example`** - Environment variables template

## 🚀 Quick Start

### Development

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your development settings
nano .env

# Start development environment (with hot reload)
npm run docker:dev

# View logs
npm run docker:dev:logs

# Stop development environment
npm run docker:dev:down
```

### Production

```bash
# Copy and configure production environment
cp .env.example .env

# Edit .env with your production settings (RDS, etc.)
nano .env

# Deploy to production
npm run deploy

# Check deployment status
npm run deploy:status

# View production logs
npm run deploy:logs
```

## 🛠 Available Scripts

### Development Scripts

- `npm run docker:dev` - Start development environment
- `npm run docker:dev:build` - Rebuild and start development
- `npm run docker:dev:logs` - View development logs
- `npm run docker:dev:down` - Stop development environment
- `npm run docker:dev:clean` - Clean development volumes

### Production Scripts

- `npm run deploy` - Deploy to production
- `npm run deploy:backup` - Deploy with database backup
- `npm run deploy:status` - Check deployment status
- `npm run deploy:logs` - View production logs
- `npm run deploy:stop` - Stop production containers
- `npm run deploy:restart` - Restart production containers

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Database (replace with your RDS endpoint)
DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/accurack_master

# Security
JWT_SECRET=your-super-strong-jwt-secret
JWT_REFRESH_SECRET=your-different-strong-refresh-secret
ENCRYPTION_KEY=your_32_character_encryption_key

# Application
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback
```

## 🏗 Architecture

### Development Environment

- **Hot Reload**: Code changes reflect instantly
- **Local Database**: PostgreSQL container for development
- **Volume Mounting**: Source code mounted for live updates
- **Debug Support**: Full debugging capabilities

### Production Environment

- **Multi-stage Build**: Optimized for size and security
- **Non-root User**: Security hardened
- **Health Checks**: Automatic container health monitoring
- **Memory Optimized**: Tuned for t2.micro (1GB RAM)
- **RDS Integration**: Automatic migrations and connection pooling

## 📊 Container Specifications

### Development

- **Base Image**: `node:22-alpine`
- **Memory**: Unlimited (development)
- **Features**: Hot reload, debugging, full toolchain

### Production

- **Base Image**: `node:22-alpine` (multi-stage)
- **Memory Limit**: 768MB (optimized for t2.micro)
- **Features**: Minimal attack surface, health checks, auto-restart

## 🔄 Deployment Workflow

### Local Development

1. Make code changes
2. Changes reflect instantly in container
3. Test your changes
4. Commit when ready

### Production Deployment

1. Push changes to Git repository
2. SSH to your EC2 instance
3. Run `npm run deploy`
4. New container starts with latest code
5. Old container is automatically removed

## 🩺 Health Checks

The application includes built-in health checks:

- **Endpoint**: `GET /api/v1/health`
- **Docker Health Check**: Automatic container monitoring
- **Response**: Application status, uptime, and version

## 🔍 Troubleshooting

### Check Container Status

```bash
npm run deploy:status
```

### View Recent Logs

```bash
npm run deploy:logs
```

### Connect to Running Container

```bash
docker exec -it accurack_backend_prod /bin/sh
```

### Database Connection Issues

```bash
# Check database connectivity from container
docker exec -it accurack_backend_prod npx prisma db pull
```

### Memory Issues (t2.micro)

The configuration is optimized for t2.micro with:

- Node.js memory limit: 768MB
- Container memory limit: 768MB
- Memory reservation: 512MB

## 🚨 Important Notes

### For AWS EC2 t2.micro:

- **Memory Optimized**: All settings tuned for 1GB RAM
- **Build Process**: May take 3-5 minutes on t2.micro
- **RDS Connection**: Ensure security groups allow connection
- **SSL/TLS**: RDS connections use SSL by default

### Security:

- Containers run as non-root user
- Only necessary ports exposed
- Environment variables for sensitive data
- Regular security updates via Alpine base image

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [AWS RDS Security](https://docs.aws.amazon.com/rds/latest/userguide/Overview.RDSSecurityGroups.html)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/docker)

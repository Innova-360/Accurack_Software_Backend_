#!/bin/bash

# EC2 Setup Script for Accurack Backend on Ubuntu t2.micro
# This sets up Docker, AWS CLI, and prepares the environment

set -e

echo "🚀 Setting up Ubuntu EC2 t2.micro for Accurack Backend..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
sudo apt install -y unzip curl ca-certificates gnupg lsb-release

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ubuntu

# Install Docker Compose
echo "📋 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 22.15.0
echo "🟢 Installing Node.js 22.15.0..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and npm installation
echo "✅ Verifying Node.js installation..."
node --version
npm --version

# Install AWS CLI v2
echo "☁️ Installing AWS CLI v2..."
if ! command -v aws &> /dev/null; then
    echo "📥 Downloading AWS CLI v2..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf awscliv2.zip aws/
else
    echo "✅ AWS CLI v2 already installed, skipping..."
fi

# Verify AWS CLI installation
echo "🔍 Verifying AWS CLI installation..."
aws --version

# Create app directory (we're already in /home/ubuntu/accurack)
echo "📁 Setting up application directory..."
cd /home/ubuntu/accurack

# Create environment file template
echo "⚙️ Creating environment template..."
cat > .env.template << 'EOF'
# ==============================================
# Accurack Backend Environment Configuration
# ==============================================

# Docker Image
IMAGE_URI=418272791309.dkr.ecr.us-east-1.amazonaws.com/accurack-backend:latest

# Database Configuration (RDS)
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/accurack_master

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-at-least-256-bits-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-different-from-jwt
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback

# Gmail Configuration
GMAIL_CLIENT_ID=your-gmail-client-id.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Frontend Configuration
FRONTEND_URL=https://yourdomain.com

# AWS Configuration
AWS_REGION=us-east-1

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
EOF

# Copy template to actual env file
cp .env.template .env

# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Deploying Accurack Backend from ECR..."

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please configure it first."
    exit 1
fi

source .env

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $(echo ${IMAGE_URI} | cut -d'/' -f1)

# Pull latest image
echo "📥 Pulling latest image from ECR..."
docker pull ${IMAGE_URI}

# Stop existing container if running
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.ec2.yml down || true

# Start new deployment
echo "🚀 Starting new deployment..."
docker-compose -f docker-compose.ec2.yml up -d

# Show status
echo "📊 Deployment status:"
docker-compose -f docker-compose.ec2.yml ps

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
echo "🏥 Health check: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000/api/v1/health"
EOF

chmod +x deploy.sh

# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash

echo "🏥 Accurack Backend Health Check"
echo "================================"

echo "🐳 Docker Status:"
sudo systemctl status docker --no-pager -l

echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.ec2.yml ps

echo ""
echo "💾 Memory Usage:"
free -h

echo ""
echo "💽 Disk Usage:"
df -h

echo ""
echo "🌐 Application Health:"
curl -f http://localhost:4000/api/v1/health 2>/dev/null || echo "❌ Health check failed"

echo ""
echo "📝 Recent Logs (last 20 lines):"
docker-compose -f docker-compose.ec2.yml logs --tail=20
EOF

chmod +x health-check.sh

# Configure swap for better performance on t2.micro
echo "💾 Setting up swap space..."
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure AWS credentials: aws configure"
echo "2. Edit environment file: nano .env"
echo "3. Upload docker-compose.ec2.yml to this directory"
echo "4. Run deployment: ./deploy.sh"
echo "5. Check health: ./health-check.sh"
echo ""
echo "📍 Current directory: $(pwd)"
echo "📁 Files created:"
ls -la

echo ""
echo "⚠️  IMPORTANT: Logout and login again for Docker group permissions!"
echo "   exit"
echo "   ssh -i \"C:/Users/DELL/Downloads/batch-2-accurack.pem\" ubuntu@ec2-54-146-54-252.compute-1.amazonaws.com"

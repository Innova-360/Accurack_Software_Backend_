#!/bin/bash

# Deploy to AWS ECR script
# This builds locally and pushes to ECR for t2.micro deployment

set -e

# Configuration - you can override these with environment variables
AWS_REGION=${AWS_REGION:-"us-east-1"}
ECR_REPOSITORY=${ECR_REPOSITORY:-"accurack-backend"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
DOCKERFILE=${DOCKERFILE:-"Dockerfile.prod"}

echo "🚀 Building and deploying to AWS ECR for t2.micro..."
echo "📋 Configuration:"
echo "   Region: $AWS_REGION"
echo "   Repository: $ECR_REPOSITORY"
echo "   Tag: $IMAGE_TAG"
echo "   Dockerfile: $DOCKERFILE"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "🏗️ Building production image locally..."
echo "   This may take a few minutes on your local machine..."

# Build with progress and timestamp
docker build \
    -f $DOCKERFILE \
    -t ${ECR_REPOSITORY}:${IMAGE_TAG} \
    --progress=plain \
    .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

# Check image size
IMAGE_SIZE=$(docker images ${ECR_REPOSITORY}:${IMAGE_TAG} --format "table {{.Size}}" | tail -n 1)
echo "📦 Built image size: $IMAGE_SIZE"

# Get ECR login token
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

if [ $? -ne 0 ]; then
    echo "❌ ECR login failed!"
    exit 1
fi

# Tag for ECR
echo "🏷️ Tagging image for ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}

# Push to ECR
echo "⬆️ Pushing to ECR..."
echo "   Repository: ${ECR_URI}:${IMAGE_TAG}"

docker push ${ECR_URI}:${IMAGE_TAG}

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed to ECR!"
    echo "🔗 Image URI: ${ECR_URI}:${IMAGE_TAG}"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Copy this URI to your EC2 environment file"
    echo "2. SSH to your EC2 instance"
    echo "3. Run the deployment commands"
    echo ""
    echo "💡 Quick deployment command for EC2:"
    echo "export IMAGE_URI=${ECR_URI}:${IMAGE_TAG}"
    echo "docker-compose -f docker-compose.ec2.yml up -d"
else
    echo "❌ Push to ECR failed!"
    exit 1
fi

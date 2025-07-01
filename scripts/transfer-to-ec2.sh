#!/bin/bash

# Transfer files to EC2 for Accurack Backend deployment
# Run this from your project root directory

KEY_PATH="C:/Users/DELL/Downloads/batch-2-accurack.pem"
EC2_HOST="ubuntu@ec2-54-146-54-252.compute-1.amazonaws.com"

echo "🚀 Transferring files to EC2 instance..."

echo "📁 Creating remote directory..."
ssh -i "$KEY_PATH" "$EC2_HOST" "mkdir -p /home/ubuntu/accurack"

echo "📤 Transferring Docker Compose file..."
scp -i "$KEY_PATH" docker-compose.ec2.yml "$EC2_HOST":/home/ubuntu/accurack/

echo "📤 Transferring Environment file..."
scp -i "$KEY_PATH" .env.ec2 "$EC2_HOST":/home/ubuntu/accurack/.env

echo "📤 Transferring Setup script..."
scp -i "$KEY_PATH" scripts/setup-ec2.sh "$EC2_HOST":/home/ubuntu/accurack/

echo "✅ Transfer complete!"
echo ""
echo "📋 Next steps:"
echo "1. SSH to EC2: ssh -i \"$KEY_PATH\" \"$EC2_HOST\""
echo "2. Navigate to: cd /home/ubuntu/accurack"
echo "3. Make script executable: chmod +x setup-ec2.sh"
echo "4. Run setup: ./setup-ec2.sh"
echo "5. Configure AWS credentials: aws configure"
echo "6. Edit environment if needed: nano .env"
echo "7. Deploy: ./deploy.sh"

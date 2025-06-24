#!/bin/bash

# Multi-Tenant Client Provisioning Script
# Usage: ./provision-client.sh <client_name> <email>

set -e

CLIENT_NAME="$1"
EMAIL="$2"

if [ -z "$CLIENT_NAME" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <client_name> <email>"
    echo "Example: $0 'John Doe Company' 'admin@johndoe.com'"
    exit 1
fi

echo "🚀 Provisioning new client: $CLIENT_NAME"
echo "📧 Email: $EMAIL"

# Create data directories if they don't exist
mkdir -p data/postgres
mkdir -p backups

# Check if PostgreSQL container is running
if ! docker ps | grep -q accurack_postgres; then
    echo "⚠️  PostgreSQL container not running. Starting docker-compose..."
    docker-compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
fi

# Call the API to create tenant
echo "📡 Creating tenant via API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/tenant/create \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$CLIENT_NAME\",
    \"email\": \"$EMAIL\"
  }")

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Client provisioned successfully!"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Failed to provision client"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Client provisioning completed!"
echo "📊 You can check the status at: http://localhost:3000/tenant/list"

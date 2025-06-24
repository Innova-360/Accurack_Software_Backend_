#!/bin/bash

# Setup Multi-Tenant Database Infrastructure
# This script initializes the master database and sets up the basic structure

set -e

echo "🚀 Setting up Multi-Tenant Database Infrastructure..."

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/postgres
mkdir -p backups

# Start PostgreSQL container
echo "🐳 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 15

# Check if container is running
until docker exec accurack_postgres pg_isready -U accurack_admin -d accurack_master; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run Prisma migrations to set up the master database
echo "🔧 Running database migrations..."
npx prisma migrate dev --name init_multi_tenant

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo ""
echo "🎉 Multi-Tenant Infrastructure Setup Complete!"
echo ""
echo "📊 Available endpoints:"
echo "  POST   /tenant/create          - Create new tenant"
echo "  GET    /tenant/list            - List all tenants"
echo "  GET    /tenant/:id             - Get tenant details"
echo "  GET    /tenant/:id/status      - Check tenant database status"
echo "  DELETE /tenant/:id             - Delete tenant"
echo ""
echo "🔧 To create a new tenant:"
echo "  ./scripts/provision-client.bat \"Company Name\" \"email@example.com\""
echo ""
echo "🚀 Start the application:"
echo "  npm run start:dev"

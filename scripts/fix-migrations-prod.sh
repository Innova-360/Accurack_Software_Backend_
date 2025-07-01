#!/bin/bash

# Accurack Production Migration Fix Script
# This script fixes failed migrations in production environment

set -e

echo "🔧 Accurack Production Migration Fix"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check container status and handle restart loops
container_status=$(docker ps -a --filter "name=accurack_backend_prod" --format "{{.Status}}")

if echo "$container_status" | grep -q "Restarting"; then
    print_warning "Container is in restart loop. Stopping to fix migrations..."
    docker-compose -f docker-compose.ec2.yml down
    sleep 5
    
    print_status "Starting container in bypass mode for migration fix..."
    # Start container with shell access to bypass startup issues
    docker-compose -f docker-compose.ec2.yml run --rm --name temp_migration_fix backend bash -c "
        echo 'Container started for migration fix...'
        sleep infinity
    " &
    
    TEMP_CONTAINER_PID=$!
    sleep 10
    
    # Use the temporary container for migration fixes
    CONTAINER_NAME="temp_migration_fix"
    
elif ! docker ps | grep -q "accurack_backend_prod"; then
    print_error "Production backend container is not running."
    print_status "Starting production container..."
    docker-compose -f docker-compose.ec2.yml up -d
    sleep 15
    CONTAINER_NAME="accurack_backend_prod"
else
    print_status "Container is running normally."
    CONTAINER_NAME="accurack_backend_prod"
fi

print_status "Checking migration status in production..."

# Function to check migration status
check_migration_status() {
    docker exec accurack_backend_prod npx prisma migrate status 2>&1 || echo "MIGRATION_CHECK_FAILED"
}

# Function to resolve failed migration
resolve_failed_migration() {
    local migration_name="20250630194620_"
    
    print_status "Resolving failed migration: $migration_name"
    
    # First, try to resolve as applied (if the schema changes were made)
    if docker exec accurack_backend_prod npx prisma migrate resolve --applied "$migration_name" 2>/dev/null; then
        print_success "Migration resolved as applied"
        return 0
    fi
    
    # If that fails, try resolving as rolled-back
    if docker exec accurack_backend_prod npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null; then
        print_success "Migration resolved as rolled-back"
        return 0
    fi
    
    print_error "Failed to resolve migration"
    return 1
}

# Function to clean failed migrations from database
clean_failed_migrations() {
    print_status "Cleaning failed migration records..."
    
    docker exec accurack_backend_prod npx prisma db execute --stdin <<EOF
DELETE FROM _prisma_migrations 
WHERE finished_at IS NULL OR applied_steps_count = 0;
EOF
    
    if [ $? -eq 0 ]; then
        print_success "Failed migration records cleaned"
    else
        print_error "Failed to clean migration records"
    fi
}

# Main execution
migration_status=$(check_migration_status)

if echo "$migration_status" | grep -q "failed migrations"; then
    print_error "Found failed migrations!"
    
    # Try to resolve the specific failed migration
    if resolve_failed_migration; then
        print_status "Attempting to deploy remaining migrations..."
        docker exec accurack_backend_prod npx prisma migrate deploy
    else
        print_warning "Migration resolution failed. Cleaning failed records..."
        clean_failed_migrations
        
        print_status "Attempting migration deploy after cleanup..."
        docker exec accurack_backend_prod npx prisma migrate deploy
    fi
    
elif echo "$migration_status" | grep -q "Database schema is up to date"; then
    print_success "Migrations are already up to date!"
    
else
    print_status "No obvious migration failures. Attempting deployment..."
    docker exec accurack_backend_prod npx prisma migrate deploy
fi

# Generate Prisma client
print_status "Generating Prisma client..."
if docker exec accurack_backend_prod npx prisma generate; then
    print_success "Prisma client generated successfully"
else
    print_error "Failed to generate Prisma client"
fi

# Final status check
print_status "Final migration status check..."
final_status=$(check_migration_status)

if echo "$final_status" | grep -q "Database schema is up to date"; then
    print_success "✅ All migrations are now working correctly!"
    
    # Restart the production service
    print_status "Restarting production backend..."
    docker-compose -f docker-compose.ec2.yml restart backend
    
    print_success "🚀 Production backend restarted successfully!"
    
else
    print_error "❌ There are still migration issues:"
    echo "$final_status"
    exit 1
fi

print_success "🎉 Production migration fix completed!"

#!/bin/bash

# Accurack Migration Fix Script
# This script automatically detects and fixes common Prisma migration issues

set -e

echo "🔧 Accurack Migration Fix Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if containers are running
if ! docker ps | grep -q "accurack_postgres_dev"; then
    print_error "PostgreSQL container is not running. Starting containers..."
    docker-compose -f docker-compose.dev.yml up -d postgres
    sleep 10
fi

if ! docker ps | grep -q "accurack_backend_dev"; then
    print_warning "Backend container is not running. Starting backend..."
    docker-compose -f docker-compose.dev.yml up -d backend-dev
    sleep 5
fi

print_status "Checking migration status..."

# Function to check migration status
check_migration_status() {
    docker exec accurack_backend_dev npx prisma migrate status 2>&1 || echo "MIGRATION_CHECK_FAILED"
}

# Function to clean failed migrations from database
clean_failed_migrations() {
    print_status "Cleaning failed migrations from database..."
    
    # Remove failed migration records
    docker exec accurack_postgres_dev psql -U accurack_admin -d accurack_master -c "
        DELETE FROM _prisma_migrations 
        WHERE finished_at IS NULL OR applied_steps_count = 0;
    " > /dev/null 2>&1
    
    print_success "Failed migration records cleaned"
}

# Function to reset migrations completely
reset_migrations() {
    print_warning "Performing complete migration reset..."
    
    # Stop backend to avoid conflicts
    docker-compose -f docker-compose.dev.yml stop backend-dev
    
    # Drop and recreate database
    docker exec accurack_postgres_dev psql -U accurack_admin -c "
        DROP DATABASE IF EXISTS accurack_master;
        CREATE DATABASE accurack_master;
    " > /dev/null 2>&1
    
    # Remove migration history
    rm -rf prisma/migrations/* 2>/dev/null || true
    
    # Create initial migration
    docker-compose -f docker-compose.dev.yml run --rm backend-dev npx prisma migrate dev --name init
    
    print_success "Database and migrations reset successfully"
}

# Function to resolve specific migration
resolve_migration() {
    local migration_name=$1
    local action=$2  # "applied" or "rolled-back"
    
    print_status "Resolving migration: $migration_name as $action"
    docker exec accurack_backend_dev npx prisma migrate resolve --$action "$migration_name"
    print_success "Migration $migration_name marked as $action"
}

# Function to fix enum conflicts
fix_enum_conflicts() {
    print_status "Checking for enum conflicts..."
    
    # Get list of existing enums
    local existing_enums=$(docker exec accurack_postgres_dev psql -U accurack_admin -d accurack_master -t -c "
        SELECT typname FROM pg_type WHERE typtype = 'e';
    " 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "")
    
    if [ ! -z "$existing_enums" ]; then
        print_warning "Found existing enums. These might cause conflicts."
        echo "$existing_enums"
    fi
}

# Main logic
migration_status=$(check_migration_status)

if echo "$migration_status" | grep -q "failed migrations"; then
    print_error "Found failed migrations!"
    
    # Extract failed migration name
    failed_migration=$(echo "$migration_status" | grep -o "migration started at.*failed" | head -1)
    
    if echo "$migration_status" | grep -q "type.*already exists"; then
        print_warning "Enum conflict detected. Cleaning up..."
        clean_failed_migrations
        
        # Try to resolve the specific migration as applied
        if echo "$migration_status" | grep -q "20250630194620_"; then
            resolve_migration "20250630194620_" "applied"
        fi
        
    else
        print_status "Attempting to clean failed migrations..."
        clean_failed_migrations
    fi
    
elif echo "$migration_status" | grep -q "MIGRATION_CHECK_FAILED"; then
    print_error "Cannot check migration status. Database might be corrupted."
    
    # Ask user for confirmation to reset
    echo -n "Do you want to reset the database completely? (y/N): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        reset_migrations
    else
        print_error "Cannot proceed without database reset. Exiting."
        exit 1
    fi
    
elif echo "$migration_status" | grep -q "Database schema is up to date"; then
    print_success "Migrations are already up to date!"
    
else
    print_status "Checking for other migration issues..."
    clean_failed_migrations
fi

# Generate Prisma client
print_status "Generating Prisma client..."
docker exec accurack_backend_dev npx prisma generate > /dev/null 2>&1
print_success "Prisma client generated"

# Final status check
print_status "Final migration status check..."
final_status=$(check_migration_status)

if echo "$final_status" | grep -q "Database schema is up to date"; then
    print_success "✅ All migrations are now working correctly!"
    
    # Restart backend service
    print_status "Restarting backend service..."
    docker-compose -f docker-compose.dev.yml restart backend-dev
    
    print_success "🚀 Backend restarted successfully!"
    print_status "Your application should be available at http://localhost:4000"
    
else
    print_error "❌ There are still migration issues:"
    echo "$final_status"
    exit 1
fi

echo ""
print_success "🎉 Migration fix completed successfully!"
print_status "You can now run your application without migration issues."

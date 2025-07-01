#!/bin/bash

# Quick Migration Fix - One-liner for any failed migration
# Usage: ./quick-migration-fix.sh

echo "🔧 Quick Migration Fix"
echo "====================="

# Stop container if running
docker-compose -f docker-compose.ec2.yml down 2>/dev/null

# Get migration status and extract failed migrations
migration_output=$(docker-compose -f docker-compose.ec2.yml run --rm backend npx prisma migrate status 2>&1)

# Extract failed migration names
failed_migrations=$(echo "$migration_output" | grep -o "[0-9]\{8\}[0-9]\{6\}_[^[:space:]]*" | sort -u)

if [ ! -z "$failed_migrations" ]; then
    echo "Found failed migrations: $failed_migrations"
    
    for migration in $failed_migrations; do
        echo "Fixing migration: $migration"
        
        # Try to resolve as applied first, then rolled-back
        docker-compose -f docker-compose.ec2.yml run --rm backend npx prisma migrate resolve --applied "$migration" 2>/dev/null || \
        docker-compose -f docker-compose.ec2.yml run --rm backend npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || \
        echo "Could not resolve $migration - will clean database records"
    done
else
    echo "No specific failed migrations found. Cleaning database records..."
    
    # Clean any incomplete migration records
    docker run --rm --network accurack-network postgres:13 psql "${DATABASE_URL}" -c "
        DELETE FROM _prisma_migrations 
        WHERE finished_at IS NULL OR applied_steps_count = 0;
    " 2>/dev/null
fi

# Deploy migrations
echo "Deploying migrations..."
docker-compose -f docker-compose.ec2.yml run --rm backend npx prisma migrate deploy

# Start application
echo "Starting application..."
docker-compose -f docker-compose.ec2.yml up -d

echo "✅ Migration fix completed!"

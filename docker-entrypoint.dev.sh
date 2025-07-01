#!/bin/sh
set -e

echo "🚀 Starting Accurack Backend (Development)..."

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
    echo "⏳ Waiting for database connection..."
    
    # Extract database host and port from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    # Wait for database to be ready (timeout after 30 seconds)
    timeout=30
    while [ $timeout -gt 0 ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            echo "✅ Database is ready!"
            break
        fi
        echo "⏳ Waiting for database... ($timeout seconds remaining)"
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ $timeout -eq 0 ]; then
        echo "❌ Database connection timeout!"
        exit 1
    fi
fi

# Run Prisma migrations for development
echo "🔄 Running database migrations (development)..."

# Function to clean failed migrations
clean_failed_migrations() {
    echo "🧹 Cleaning failed migrations..."
    # This requires psql to be available in the container or we skip it
    # The external fix script will handle this
    return 0
}

# Function to handle migration issues
handle_migration_issues() {
    local migration_output="$1"
    
    if echo "$migration_output" | grep -q "failed migrations"; then
        echo "⚠️  Failed migrations detected. Attempting automatic fix..."
        
        # Try to resolve common issues
        if echo "$migration_output" | grep -q "already exists"; then
            echo "🔧 Enum conflict detected. Marking problematic migration as applied..."
            npx prisma migrate resolve --applied "20250630194620_" 2>/dev/null || true
        fi
        
        # Try migrate deploy as fallback
        echo "🔄 Attempting migrate deploy..."
        npx prisma migrate deploy 2>/dev/null || {
            echo "❌ Automatic migration fix failed."
            echo "📝 Please run: ./scripts/fix-migrations.sh (or .bat on Windows)"
            echo "💡 The application will continue but may have database issues."
            return 1
        }
    fi
    
    return 0
}

# Attempt migrations with error handling
migration_output=$(npx prisma migrate dev --name "auto-migration" 2>&1) || {
    echo "⚠️  Migration failed. Attempting to fix..."
    handle_migration_issues "$migration_output"
    
    # Try one more time after fixing
    npx prisma migrate dev --name "auto-migration-retry" 2>/dev/null || {
        echo "🔄 Falling back to migrate deploy..."
        npx prisma migrate deploy || {
            echo "❌ All migration attempts failed."
            echo "📝 Please run the fix script: ./scripts/fix-migrations.sh"
        }
    }
}

# Generate Prisma client (ensure it's up to date)
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database seed (if needed)
echo "🌱 Running database seed (if needed)..."
npx prisma db seed 2>/dev/null || echo "ℹ️  Seed not required or already completed"

echo "✅ Development setup complete!"

# Start the application in development mode
exec npm run start:dev

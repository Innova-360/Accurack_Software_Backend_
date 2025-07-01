#!/bin/sh
set -e

echo "🚀 Starting Accurack Backend..."

# Wait for database to be ready (if using external database)
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

# Run Prisma migrations
echo "🔄 Running database migrations..."
if [ "$NODE_ENV" = "production" ]; then
    npx prisma migrate deploy
else
    # In development, apply any pending migrations
    npx prisma migrate dev --name "auto-migration" 2>/dev/null || npx prisma migrate deploy
fi

# Run database seed (if needed)
echo "🌱 Running database seed (if needed)..."
npx prisma db seed 2>/dev/null || echo "ℹ️  Seed not required or already completed"

# Generate Prisma client (ensure it's up to date)
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "✅ Backend startup complete!"

# Start the application
exec node dist/src/main.js

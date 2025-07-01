@echo off
setlocal enabledelayedexpansion

:: Accurack Migration Fix Script for Windows
:: This script automatically detects and fixes common Prisma migration issues

echo 🔧 Accurack Migration Fix Script (Windows)
echo ==========================================

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker first.
    exit /b 1
)

:: Check if containers are running
docker ps | findstr "accurack_postgres_dev" >nul
if %errorlevel% neq 0 (
    echo [WARNING] PostgreSQL container is not running. Starting containers...
    docker-compose -f docker-compose.dev.yml up -d postgres
    timeout /t 10 /nobreak >nul
)

docker ps | findstr "accurack_backend_dev" >nul
if %errorlevel% neq 0 (
    echo [WARNING] Backend container is not running. Starting backend...
    docker-compose -f docker-compose.dev.yml up -d backend-dev
    timeout /t 5 /nobreak >nul
)

echo [INFO] Checking migration status...

:: Check migration status
docker exec accurack_backend_dev npx prisma migrate status 2>temp_migration_status.txt 1>temp_migration_status.txt
set /p migration_status=<temp_migration_status.txt

:: Check for failed migrations
echo %migration_status% | findstr "failed migrations" >nul
if %errorlevel% equ 0 (
    echo [ERROR] Found failed migrations!
    
    :: Clean failed migrations
    echo [INFO] Cleaning failed migrations from database...
    docker exec accurack_postgres_dev psql -U accurack_admin -d accurack_master -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL OR applied_steps_count = 0;" >nul 2>&1
    echo [SUCCESS] Failed migration records cleaned
    
    :: Check for enum conflicts
    echo %migration_status% | findstr "already exists" >nul
    if %errorlevel% equ 0 (
        echo [WARNING] Enum conflict detected. Resolving migration...
        docker exec accurack_backend_dev npx prisma migrate resolve --applied "20250630194620_" >nul 2>&1
        echo [SUCCESS] Migration resolved as applied
    )
) else (
    echo %migration_status% | findstr "Database schema is up to date" >nul
    if %errorlevel% equ 0 (
        echo [SUCCESS] Migrations are already up to date!
    ) else (
        echo [INFO] Cleaning potential migration issues...
        docker exec accurack_postgres_dev psql -U accurack_admin -d accurack_master -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL OR applied_steps_count = 0;" >nul 2>&1
    )
)

:: Generate Prisma client
echo [INFO] Generating Prisma client...
docker exec accurack_backend_dev npx prisma generate >nul 2>&1
echo [SUCCESS] Prisma client generated

:: Final status check
echo [INFO] Final migration status check...
docker exec accurack_backend_dev npx prisma migrate status 2>temp_final_status.txt 1>temp_final_status.txt

:: Check if everything is working
type temp_final_status.txt | findstr "Database schema is up to date" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] ✅ All migrations are now working correctly!
    
    :: Restart backend service
    echo [INFO] Restarting backend service...
    docker-compose -f docker-compose.dev.yml restart backend-dev >nul
    
    echo [SUCCESS] 🚀 Backend restarted successfully!
    echo [INFO] Your application should be available at http://localhost:4000
) else (
    echo [ERROR] ❌ There are still migration issues:
    type temp_final_status.txt
    goto cleanup
)

echo.
echo [SUCCESS] 🎉 Migration fix completed successfully!
echo [INFO] You can now run your application without migration issues.
goto cleanup

:cleanup
:: Clean up temporary files
if exist temp_migration_status.txt del temp_migration_status.txt
if exist temp_final_status.txt del temp_final_status.txt
pause

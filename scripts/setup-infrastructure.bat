@echo off
REM Setup Multi-Tenant Database Infrastructure for Windows
REM This script initializes the master database and sets up the basic structure

echo 🚀 Setting up Multi-Tenant Database Infrastructure...

REM Create data directories
echo 📁 Creating data directories...
if not exist "data\postgres" mkdir "data\postgres"
if not exist "backups" mkdir "backups"

REM Start PostgreSQL container
echo 🐳 Starting PostgreSQL container...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 15 >nul

REM Check if container is running
:wait_for_postgres
docker exec accurack_postgres pg_isready -U accurack_admin -d accurack_master >nul 2>&1
if errorlevel 1 (
    echo Waiting for PostgreSQL...
    timeout /t 2 >nul
    goto wait_for_postgres
)

echo ✅ PostgreSQL is ready!

REM Generate Prisma client
echo ⚙️  Generating Prisma client...
npx prisma generate

echo.
echo 🎉 Multi-Tenant Infrastructure Setup Complete!
echo.
echo 📊 Available endpoints:
echo   POST   /tenant/create          - Create new tenant
echo   GET    /tenant/list            - List all tenants
echo   GET    /tenant/:id             - Get tenant details
echo   GET    /tenant/:id/status      - Check tenant database status
echo   DELETE /tenant/:id             - Delete tenant
echo.
echo 🔧 To create a new tenant:
echo   scripts\provision-client.bat "Company Name" "email@example.com"
echo.
echo 🚀 Start the application:
echo   npm run start:dev

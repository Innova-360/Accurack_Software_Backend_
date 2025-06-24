@echo off
REM Multi-Tenant Client Provisioning Script for Windows
REM Usage: provision-client.bat "Client Name" "email@example.com"

setlocal enabledelayedexpansion

set CLIENT_NAME=%~1
set EMAIL=%~2

if "%CLIENT_NAME%"=="" (
    echo Usage: %0 "Client Name" "email@example.com"
    echo Example: %0 "John Doe Company" "admin@johndoe.com"
    exit /b 1
)

if "%EMAIL%"=="" (
    echo Usage: %0 "Client Name" "email@example.com"
    echo Example: %0 "John Doe Company" "admin@johndoe.com"
    exit /b 1
)

echo 🚀 Provisioning new client: %CLIENT_NAME%
echo 📧 Email: %EMAIL%

REM Create data directories if they don't exist
if not exist "data\postgres" mkdir "data\postgres"
if not exist "backups" mkdir "backups"

REM Check if PostgreSQL container is running
docker ps | findstr accurack_postgres >nul
if errorlevel 1 (
    echo ⚠️  PostgreSQL container not running. Starting docker-compose...
    docker-compose up -d postgres
    echo ⏳ Waiting for PostgreSQL to be ready...
    timeout /t 10 >nul
)

REM Call the API to create tenant
echo 📡 Creating tenant via API...
curl -s -X POST http://localhost:3000/tenant/create ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"%CLIENT_NAME%\", \"email\": \"%EMAIL%\"}"

echo.
echo 🎉 Client provisioning completed!
echo 📊 You can check the status at: http://localhost:3000/tenant/list

@echo off
REM HIBE AI Payment Service - Docker Quick Start Script (Windows)

echo 🚀 Starting HIBE AI Payment Service with Docker...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install it and try again.
    pause
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "database" mkdir database
if not exist "logs" mkdir logs

REM Build and start the application
echo 🔨 Building and starting the application...
docker-compose up --build -d

REM Wait for the application to be ready
echo ⏳ Waiting for the application to be ready...
timeout /t 10 /nobreak >nul

REM Check if the application is running
echo 🔍 Checking application health...
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Application is running successfully!
    echo 🌐 API available at: http://localhost:3000
    echo 📊 Health check: http://localhost:3000/health
    echo 📈 Metrics: http://localhost:3000/metrics
    echo.
    echo 📚 API Documentation: http://localhost:3000/api-docs (if Swagger is enabled)
    echo.
    echo 🛑 To stop the application, run: docker-compose down
    echo 📝 To view logs, run: docker-compose logs -f
) else (
    echo ❌ Application failed to start. Check logs with: docker-compose logs
    pause
    exit /b 1
)

REM Optional: Start monitoring stack
if "%1"=="--with-monitoring" (
    echo 📊 Starting monitoring stack...
    docker-compose --profile monitoring up -d prometheus
    echo 📈 Prometheus available at: http://localhost:9090
)

pause

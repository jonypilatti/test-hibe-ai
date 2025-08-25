#!/bin/bash

# HIBE AI Payment Service - Docker Quick Start Script

echo "🚀 Starting HIBE AI Payment Service with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p database logs

# Build and start the application
echo "🔨 Building and starting the application..."
docker-compose up --build -d

# Wait for the application to be ready
echo "⏳ Waiting for the application to be ready..."
sleep 10

# Check if the application is running
echo "🔍 Checking application health..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 API available at: http://localhost:3000"
    echo "📊 Health check: http://localhost:3000/health"
    echo "📈 Metrics: http://localhost:3000/metrics"
    echo ""
    echo "📚 API Documentation: http://localhost:3000/api-docs (if Swagger is enabled)"
    echo ""
    echo "🛑 To stop the application, run: docker-compose down"
    echo "📝 To view logs, run: docker-compose logs -f"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Optional: Start monitoring stack
if [ "$1" = "--with-monitoring" ]; then
    echo "📊 Starting monitoring stack..."
    docker-compose --profile monitoring up -d prometheus
    echo "📈 Prometheus available at: http://localhost:9090"
fi

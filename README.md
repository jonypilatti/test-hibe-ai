# 🚀 HIBE AI - Payment Request Service

> A robust, production-ready payment request service built with Node.js, TypeScript, and Express.

[![Node.js](https://img.shields.io/badge/Node.js-22.18.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.44-003B57.svg)](https://www.sqlite.org/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.35-52B0E7.svg)](https://sequelize.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-77%20passing-brightgreen.svg)](https://github.com/yourusername/hibe-ai-payment-service)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://hub.docker.com/)

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [🧪 Testing Guide](#-testing-guide)
- [📚 API Testing with cURL](#-api-testing-with-curl)
- [🔧 Configuration](#-configuration)
- [🏗️ Architecture](#️-architecture)
- [🐳 Docker](#-docker)
- [📊 Monitoring](#-monitoring)
- [🚀 Production Deployment](#-production-deployment)
- [🤝 Contributing](#-contributing)
- [📁 Project Structure](#-project-structure)
- [🏆 Key Features](#-key-features)
- [📄 License](#-license)

## 🎯 Overview

HIBE AI Payment Request Service is a comprehensive payment management system that provides a complete solution for handling payment requests, batch processing, and webhook integrations. Built with modern Node.js practices and enterprise-grade architecture.

### 🎯 **Challenge Requirements Met**

✅ **Create Payment Request** - With input validation and idempotency  
✅ **List Existing Requests** - With cursor-based pagination  
✅ **Simulate Status Updates** - Via secured webhooks  
✅ **Batch Creation** - With retries and concurrent processing  
✅ **Complete Stack** - Node.js + TypeScript + Express + SQLite + Sequelize  

### 🏆 **Bonus Features Implemented**

✅ **Docker Support** - Complete containerization with Docker Compose  
✅ **OpenAPI Specification** - Comprehensive API documentation  
✅ **Monitoring & Metrics** - Prometheus integration and health checks  
✅ **Production Ready** - Security, logging, and error handling  

## ✨ Features

### 🔒 **Core Functionality**
- **Payment Management**: Create, list, and update payment requests
- **Idempotency**: Full idempotency support at all levels
- **Batch Processing**: Process up to 100 payments concurrently
- **Webhook System**: Secure status update simulation
- **Pagination**: Cursor-based pagination for large datasets

### 🛡️ **Security & Reliability**
- **Input Validation**: Comprehensive Joi schemas
- **Rate Limiting**: Configurable rate limiting per endpoint
- **Authentication**: Webhook token-based security
- **Error Handling**: Professional error handling with proper HTTP status codes
- **Graceful Shutdown**: Clean server termination

### 📊 **Monitoring & Observability**
- **Structured Logging**: Winston-based logging with multiple transports
- **Metrics**: Prometheus metrics for monitoring
- **Health Checks**: Comprehensive health check endpoint
- **Audit Logs**: Detailed request/response logging

### 🐳 **DevOps & Deployment**
- **Docker Support**: Complete containerization
- **Environment Management**: Flexible configuration
- **CI/CD Ready**: Comprehensive testing suite
- **Production Deployment**: PM2 and systemd support

## 🚀 Quick Start Guide

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Git
- Docker & Docker Compose (optional, for containerized setup)

### **1. Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/hibe-ai-payment-service.git
cd hibe-ai-payment-service

# Install dependencies
npm install
```

### **2. Environment Configuration**
```bash
# Create .env file
cp env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./database/hibe_ai.db
DB_LOGGING=true

# Security
WEBHOOK_TOKEN=your-secret-webhook-token-minimum-32-characters
JWT_SECRET=your-jwt-secret-key-minimum-32-characters

# URLs
CHECKOUT_BASE_URL=https://sandbox.hibe.local/checkout
```

### **3. Database Setup**
```bash
# Create necessary directories
mkdir database logs

# Run database migrations
npm run migrate

# Seed with sample data (optional)
npm run seed
```

### **4. Start the Application**
```bash
# Development mode with hot reload
npm run dev

# The server will start on http://localhost:3000
```

### **5. Verify Installation**
```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "OK",
  "environment": "development",
  "database": { "status": "healthy" }
}
```

## 🧪 Testing Guide

### **Run All Tests**
```bash
# Run complete test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests for CI/CD
npm run test:ci
```

### **Test Structure**
```
src/__tests__/
├── PaymentService.test.ts      # Payment business logic tests
├── BatchPaymentService.test.ts # Batch processing tests
├── PaymentController.test.ts   # Payment API endpoint tests
├── WebhookController.test.ts   # Webhook endpoint tests
├── validationSchemas.test.ts   # Input validation tests
├── idempotency.test.ts        # Idempotency middleware tests
└── setup.ts                   # Global test configuration
```

### **Test Coverage**
- **Unit Tests**: 77 tests covering all core functionality
- **Service Layer**: Business logic validation
- **Controller Layer**: HTTP request/response handling
- **Middleware**: Authentication, validation, idempotency
- **Validation**: Input schema validation
- **Integration**: Database operations and API flows

### **Running Specific Test Suites**
```bash
# Run only payment service tests
npm test -- PaymentService.test.ts

# Run only controller tests
npm test -- Controller

# Run tests matching a pattern
npm test -- --testNamePattern="createPayment"
```

## 📚 API Testing with cURL

### **Base URL**: `http://localhost:3000/api/v1`

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

### **2. Create Payment Request**
```bash
# Generate a UUID for idempotency
IDEMPOTENCY_KEY=$(uuidgen)

curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "description": "Payment for consulting services",
    "due_date": "2026-01-15",
    "amount_cents": 50000,
    "currency": "USD",
    "payer": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }'
```

**Expected Response (201):**
```json
{
  "payment_id": "uuid-generated",
  "status": "pending",
  "checkout_url": "https://sandbox.hibe.local/checkout/uuid-generated"
}
```

### **3. List Payments**
```bash
# List all payments
curl "http://localhost:3000/api/v1/payments"

# List with pagination
curl "http://localhost:3000/api/v1/payments?limit=5"

# Filter by status
curl "http://localhost:3000/api/v1/payments?status=pending&limit=10"

# Use cursor for pagination
curl "http://localhost:3000/api/v1/payments?limit=5&cursor=2025-08-25T00:18:06.941Z"
```

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "description": "Payment for consulting services",
      "due_date": "2026-01-15",
      "amount_cents": 50000,
      "currency": "USD",
      "payer_name": "John Doe",
      "payer_email": "john.doe@example.com",
      "status": "pending",
      "checkout_url": "https://sandbox.hibe.local/checkout/uuid",
      "created_at": "2025-08-25T00:18:06.941Z"
    }
  ],
  "next_cursor": "2025-08-25T00:18:06.939Z"
}
```

### **4. Batch Payments**
```bash
# Generate batch idempotency key
BATCH_IDEMPOTENCY_KEY=$(uuidgen)

curl -X POST http://localhost:3000/api/v1/payments/batch \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $BATCH_IDEMPOTENCY_KEY" \
  -d '{
    "payments": [
      {
        "description": "Batch payment 1",
        "due_date": "2026-01-20",
        "amount_cents": 10000,
        "currency": "USD",
        "payer": {
          "name": "User 1",
          "email": "user1@example.com"
        }
      },
      {
        "description": "Batch payment 2",
        "due_date": "2026-01-25",
        "amount_cents": 15000,
        "currency": "ARS",
        "payer": {
          "name": "User 2",
          "email": "user2@example.com"
        }
      }
    ]
  }'
```

**Expected Response (200):**
```json
{
  "results": [
    {
      "index": 0,
      "payment_id": "uuid-1",
      "status": "pending"
    },
    {
      "index": 1,
      "payment_id": "uuid-2",
      "status": "pending"
    }
  ],
  "failed": 0,
  "succeeded": 2
}
```

### **5. Webhook Simulation**
```bash
# First, get a payment ID from the list endpoint
PAYMENT_ID="uuid-from-list-endpoint"

curl -X POST http://localhost:3000/api/v1/webhooks/simulate \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: your-webhook-token-from-env" \
  -d '{
    "payment_id": "'$PAYMENT_ID'",
    "new_status": "paid",
    "reason": "Payment completed successfully"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Payment status updated successfully",
  "payment_id": "uuid",
  "new_status": "paid",
  "reason": "Payment completed successfully"
}
```

### **6. Test Idempotency**
```bash
# Use the same idempotency key with same payload
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "description": "Payment for consulting services",
    "due_date": "2026-01-15",
    "amount_cents": 50000,
    "currency": "USD",
    "payer": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }'

# Should return the same payment_id and 200 status
```

### **7. Test Error Cases**
```bash
# Test validation error (missing required field)
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "description": "Invalid payment",
    "amount_cents": 50000
  }'

# Test invalid idempotency key
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invalid-key" \
  -d '{
    "description": "Payment for services",
    "due_date": "2026-01-15",
    "amount_cents": 50000,
    "currency": "USD",
    "payer": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }'

# Test invalid webhook token
curl -X POST http://localhost:3000/api/v1/webhooks/simulate \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: invalid-token" \
  -d '{
    "payment_id": "uuid",
    "new_status": "paid"
  }'
```

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `DB_PATH` | Database file path | ./database/hibe_ai.db | Yes |
| `WEBHOOK_TOKEN` | Webhook authentication token | - | Yes |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `CHECKOUT_BASE_URL` | Checkout base URL | - | Yes |

### **Feature Flags**
```bash
ENABLE_BATCH_PROCESSING=true
ENABLE_WEBHOOKS=true
ENABLE_IDEMPOTENCY=true
ENABLE_METRICS=true
```

### **Rate Limiting**
```bash
# Default rate limits
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # 100 requests per window
```

## 🏗️ Architecture

```
src/
├── config/          # Configuration management
├── controllers/     # HTTP request handlers
├── middleware/      # Custom middleware (auth, validation, etc.)
├── models/          # Database models and associations
├── routes/          # API route definitions
├── services/        # Business logic layer
├── validations/     # Input validation schemas
└── index.ts         # Application entry point
```

### **Architecture Patterns**
- **Layered Architecture**: Clear separation of concerns
- **Dependency Injection**: Services injected into controllers
- **Middleware Chain**: Request processing pipeline
- **Error Handling**: Centralized error management
- **Validation**: Request/response validation at multiple levels

## 🐳 Docker

### **Quick Start with Docker**
```bash
# Using the quick start script (Linux/Mac)
chmod +x docker-start.sh
./docker-start.sh

# Using the quick start script (Windows)
docker-start.bat

# Manual Docker Compose
docker-compose up --build

# With monitoring stack
docker-compose --profile monitoring up --build
```

### **Docker Compose Services**
- **hibe-ai**: Node.js application with hot reload
- **prometheus**: Metrics collection (optional, use `--with-monitoring` flag)

### **Docker Commands**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Access container shell
docker-compose exec hibe-ai sh
```

### **Docker Configuration**
- **Multi-stage build** for optimized production images
- **Non-root user** for security
- **Health checks** for container monitoring
- **Volume mounts** for persistent data
- **Environment variables** for configuration

## 📚 API Documentation

### **OpenAPI Specification**
The complete API documentation is available in `openapi.yaml` and can be viewed with any OpenAPI-compatible tool like Swagger UI.

**Features:**
- **Complete Endpoint Coverage**: All API endpoints documented
- **Request/Response Schemas**: Detailed data models
- **Error Responses**: Comprehensive error documentation
- **Authentication**: Security scheme documentation
- **Examples**: Real-world usage examples

### **Interactive Documentation**
```bash
# If you have Swagger UI installed
npx swagger-ui-serve openapi.yaml

# Or use online tools like:
# - https://editor.swagger.io/
# - https://petstore.swagger.io/
```

## 📊 Monitoring

### **Health Check**
```bash
GET /health
```
Returns comprehensive system status including database health, memory usage, and feature flags.

### **Metrics (Prometheus)**
```bash
GET /metrics
```
Provides detailed metrics for:
- HTTP request counts and durations
- Database query performance
- Payment processing statistics
- System resource usage

### **Logging**
- **Console**: Development-friendly formatted logs
- **File**: Production-ready JSON logs with rotation
- **Audit**: Security and business event logging
- **HTTP**: Request/response logging

### **Monitoring Stack**
- **Application Metrics**: Custom business metrics
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Query performance and connections
- **External Monitoring**: Prometheus integration ready

## 🚀 Production Deployment

### **1. Build for Production**
```bash
npm run build
```

### **2. Environment Configuration**
```bash
NODE_ENV=production
PORT=3000
DB_PATH=/var/lib/hibe-ai/hibe_ai.db
WEBHOOK_TOKEN=<secure-token>
JWT_SECRET=<secure-secret>
CHECKOUT_BASE_URL=https://your-domain.com/checkout
```

### **3. Process Management**
```bash
# Using PM2
npm install -g pm2
pm2 start dist/index.js --name "hibe-ai-payment-service"

# Using systemd
sudo systemctl enable hibe-ai-payment-service
sudo systemctl start hibe-ai-payment-service
```

### **4. Docker Production**
```bash
# Build production image
docker build -t hibe-ai-payment-service:latest .

# Run with production environment
docker run -d \
  --name hibe-ai-production \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -v /var/lib/hibe-ai:/app/database \
  hibe-ai-payment-service:latest
```

## 🤝 Contributing

### **Development Setup**
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run linting
npm run lint

# Run formatting
npm run format

# Run tests
npm test
```

### **Code Quality**
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Jest**: Comprehensive testing framework

### **Development Workflow**
1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Run** tests to ensure everything works
5. **Submit** a pull request

## 📁 Project Structure

```
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # HTTP request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── validations/     # Input validation
│   └── index.ts         # App entry point
├── database/            # Database files and scripts
├── logs/                # Application logs
├── src/__tests__/       # Test files
├── .env.example         # Environment template
├── docker-compose.yml   # Docker setup
├── Dockerfile           # Docker configuration
├── docker-start.sh      # Docker quick start (Linux/Mac)
├── docker-start.bat     # Docker quick start (Windows)
├── prometheus.yml       # Prometheus configuration
├── openapi.yaml         # OpenAPI specification
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## 🏆 **Key Features**

This project demonstrates modern backend engineering practices:

- **🔒 Security**: Comprehensive input validation, rate limiting, authentication
- **📊 Observability**: Structured logging, metrics, health checks
- **🏗️ Architecture**: Clean separation of concerns, dependency injection
- **🧪 Testing**: Comprehensive test coverage and testing strategies
- **🐳 DevOps**: Docker support, environment management, graceful shutdown
- **📈 Scalability**: Batch processing, concurrent workers, connection pooling
- **🔄 Reliability**: Idempotency, retry mechanisms, error handling

### **Technical Highlights**
- **TypeScript**: Full type safety throughout the application
- **Sequelize ORM**: Robust database operations with migrations
- **Joi Validation**: Comprehensive input validation schemas
- **Winston Logging**: Structured logging with multiple transports
- **Prometheus Metrics**: Production-ready monitoring
- **Docker**: Complete containerization support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js** team for the excellent web framework
- **Sequelize** team for the robust ORM
- **Joi** team for the validation library
- **Winston** team for the logging framework

---

**Built for the HIBE AI Technical Challenge**

*Ready for production deployment with enterprise-grade architecture.*

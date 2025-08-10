#!/bin/bash

# SecureVault Deployment Script
# This script deploys the current development version of SecureVault

set -e

echo "🚀 Deploying SecureVault Development Environment"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

echo "✅ Docker is running"
echo "✅ docker-compose is available"

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/files data/backups data/temp data/ssl

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check database
if docker-compose exec -T db pg_isready -U securevault_user -d securevault; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis health check failed"
fi

# Check backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "⚠️  Backend API health check failed (may still be starting)"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed (may still be starting)"
fi

# Check nginx
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Nginx proxy is healthy"
else
    echo "⚠️  Nginx proxy health check failed (may still be starting)"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Service Information:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  Nginx Proxy:  http://localhost:80"
echo "  Database:     localhost:5430"
echo "  Redis:        localhost:6379"
echo ""
echo "📊 Development Status:"
echo "  ✅ Infrastructure Setup Complete"
echo "  ✅ Test Structure Complete (129 tests)"
echo "  🔄 Basic Application Running"
echo "  ⏳ Authentication Implementation (Next: Task 2.2)"
echo "  ⏳ Document Management (Future)"
echo ""
echo "🔧 Useful Commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop all:     docker-compose down"
echo "  Restart:      docker-compose restart"
echo "  Run tests:    docker-compose exec backend python -m pytest"
echo ""
echo "📝 Note: Authentication endpoints return 501 (Not Implemented) as expected."
echo "    This is a development deployment showing infrastructure and basic connectivity."
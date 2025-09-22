#!/bin/bash

echo "🚀 Starting Blog Microservices..."

# Stop any existing processes
echo "🛑 Stopping existing services..."
pkill -f "post-service" || true
pkill -f "user-service" || true 
pkill -f "api-gateway" || true

# Start database if not running
echo "🐘 Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "⚠️  PostgreSQL not running. Please start it with:"
  echo "   docker-compose up -d postgres"
  echo "   OR brew services start postgresql"
  exit 1
fi

# Build all services
echo "🔨 Building services..."
nx build user-service
nx build post-service  
nx build api-gateway

# Start services in background
echo "🚀 Starting User Service (port 3001)..."
nx serve user-service &
USER_PID=$!

sleep 5

echo "🚀 Starting Post Service (port 3002)..."
nx serve post-service &
POST_PID=$!

sleep 5

echo "🚀 Starting API Gateway (port 3000)..."
nx serve api-gateway &
GATEWAY_PID=$!

sleep 5

echo "✅ Services started!"
echo ""
echo "📋 Service Status:"
echo "  • User Service: http://localhost:3001"
echo "  • Post Service: http://localhost:3002" 
echo "  • API Gateway: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "  • Post Service Swagger: http://localhost:3002/docs"
echo "  • API Gateway Health: http://localhost:3000/health"
echo ""
echo "🛑 To stop all services, run:"
echo "   kill $USER_PID $POST_PID $GATEWAY_PID"
echo ""
echo "PIDs: User=$USER_PID, Post=$POST_PID, Gateway=$GATEWAY_PID"
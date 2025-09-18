#!/bin/bash

echo "🚀 Setting up Nx workspace with correct syntax..."

# Initialize Nx in existing folder 
npx nx@latest init

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating applications..."
nx generate @nx/nest:application apps/api-gateway --no-interactive
nx generate @nx/nest:application apps/user-service --no-interactive
nx generate @nx/nest:application apps/post-service --no-interactive
nx generate @nx/nest:application apps/comment-service --no-interactive
nx generate @nx/nest:application apps/notification-service --no-interactive
nx generate @nx/nest:application apps/analytics-service --no-interactive

echo "📚 Generating shared libraries..."
nx generate @nx/nest:library libs/shared/shared-config --no-interactive
nx generate @nx/nest:library libs/shared/kafka --no-interactive
nx generate @nx/nest:library libs/shared/database --no-interactive
nx generate @nx/nest:library libs/shared/auth --no-interactive
nx generate @nx/nest:library libs/shared/dto --no-interactive

echo "✅ Nx workspace setup completed successfully!"
echo "📊 View dependency graph: npm run dep-graph"
echo "🔨 Build all: npm run build:all"
echo "🧪 Test all: npm run test:all"

# Install additional microservices dependencies
echo "📦 Installing microservices dependencies..."
npm install @nestjs/microservices kafkajs @nestjs/typeorm typeorm pg @nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport-jwt bcrypt @nestjs/swagger helmet express-rate-limit @nestjs/websockets @nestjs/platform-socket.io nodemailer redis --legacy-peer-deps

echo "🎉 All setup completed! Ready to start development."

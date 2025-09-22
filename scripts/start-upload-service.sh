#!/bin/bash

# Script to start upload-service in development mode

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Upload Service...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env file manually${NC}"
        exit 1
    fi
fi

# Check required environment variables
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"

# MongoDB
if [ -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}⚠️  MONGODB_URI not set. Using default: mongodb://localhost:27017/blog-uploads${NC}"
    export MONGODB_URI="mongodb://localhost:27017/blog-uploads"
fi

# Cloudinary
if [ -z "$CLOUDINARY_CLOUD_NAME" ] || [ -z "$CLOUDINARY_API_KEY" ] || [ -z "$CLOUDINARY_API_SECRET" ]; then
    echo -e "${RED}❌ Cloudinary credentials not set. Please configure:${NC}"
    echo -e "${RED}   - CLOUDINARY_CLOUD_NAME${NC}"
    echo -e "${RED}   - CLOUDINARY_API_KEY${NC}"
    echo -e "${RED}   - CLOUDINARY_API_SECRET${NC}"
    echo -e "${YELLOW}💡 Get your Cloudinary credentials from: https://cloudinary.com/console${NC}"
    exit 1
fi

# JWT Secret
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET not set. Using default (not secure for production)${NC}"
    export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
fi

# Port
if [ -z "$UPLOAD_SERVICE_PORT" ]; then
    echo -e "${YELLOW}⚠️  UPLOAD_SERVICE_PORT not set. Using default: 3003${NC}"
    export PORT=3003
else
    export PORT=$UPLOAD_SERVICE_PORT
fi

echo -e "${GREEN}✅ Environment check completed${NC}"

# Start MongoDB if not running (for local development)
echo -e "${YELLOW}🔍 Checking MongoDB connection...${NC}"
if ! nc -z localhost 27017; then
    echo -e "${YELLOW}⚠️  MongoDB not running on localhost:27017${NC}"
    echo -e "${YELLOW}💡 Start MongoDB with: brew services start mongodb-community${NC}"
    echo -e "${YELLOW}💡 Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:6.0${NC}"
    
    # Ask user if they want to start MongoDB via Docker
    read -p "Do you want to start MongoDB via Docker? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🐳 Starting MongoDB with Docker...${NC}"
        docker run -d -p 27017:27017 --name mongodb-upload \
            -e MONGO_INITDB_ROOT_USERNAME=admin \
            -e MONGO_INITDB_ROOT_PASSWORD=password \
            mongo:6.0
        
        # Wait for MongoDB to start
        echo -e "${YELLOW}⏳ Waiting for MongoDB to start...${NC}"
        sleep 10
        
        if nc -z localhost 27017; then
            echo -e "${GREEN}✅ MongoDB started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start MongoDB${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ MongoDB is required. Please start it and try again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ MongoDB is running${NC}"
fi

# Build and start the service
echo -e "${GREEN}🔧 Building upload-service...${NC}"
npx nx build upload-service

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
    echo -e "${GREEN}🚀 Starting upload-service on port ${PORT}...${NC}"
    echo -e "${GREEN}📚 API Documentation will be available at: http://localhost:${PORT}/api/docs${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop the service${NC}"
    
    npx nx serve upload-service
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
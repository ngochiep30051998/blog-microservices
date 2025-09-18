#!/bin/bash

echo "🛑 Stopping Blog Microservices Development Environment..."

# Stop all services
docker-compose down

# Optional: Remove volumes
read -p "Remove all data volumes? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing volumes..."
    docker-compose down -v
    docker system prune -f
fi

echo "✅ Environment stopped successfully!"
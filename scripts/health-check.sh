#!/bin/bash

echo "🏥 Checking service health..."

services=("zookeeper:2181" "kafka:9092" "postgres:5432" "mongodb:27017" "redis:6379" "elasticsearch:9200")

for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    name=${ADDR}
    port=${ADDR}
    
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $name is healthy"
    else  
        echo "❌ $name is not responding"
    fi
done

# Test Kafka topics
echo ""
echo "📋 Kafka Topics:"
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null || echo "❌ Cannot connect to Kafka"

# Test database connections
echo ""
echo "🗄️  Database Connections:"
docker-compose exec -T postgres pg_isready -U blog_user -d blog_db > /dev/null && echo "✅ PostgreSQL connection OK" || echo "❌ PostgreSQL connection failed"
docker-compose exec -T mongodb mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1 && echo "✅ MongoDB connection OK" || echo "❌ MongoDB connection failed"  
docker-compose exec -T redis redis-cli --raw incr ping > /dev/null 2>&1 && echo "✅ Redis connection OK" || echo "❌ Redis connection failed"

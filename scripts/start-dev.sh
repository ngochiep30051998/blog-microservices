#!/bin/bash

echo "🚀 Starting Blog Microservices Development Environment..."

# Load environment variables
set -a
source .env
set +a

# Tạo network nếu chưa có
docker network create blog-microservices-network 2>/dev/null || true

# Start core services first
echo "📦 Starting core infrastructure..."
docker-compose up -d zookeeper kafka postgres mongodb redis elasticsearch

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
docker-compose exec -T kafka /opt/kafka/create-topics.sh

# Start remaining services
echo "🔧 Starting additional services..."
docker-compose up -d kafka-ui mailhog kibana

# Optional: Start monitoring stack
read -p "Start monitoring stack (Prometheus + Grafana)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose up -d prometheus grafana
fi

echo "✅ Development environment is ready!"
echo ""
echo "📊 Available Services:"
echo "  - Kafka UI: http://localhost:${KAFKA_UI_PORT}"
echo "  - PostgreSQL: localhost:${POSTGRES_PORT}"
echo "  - MongoDB: localhost:${MONGO_PORT}"
echo "  - Redis: localhost:${REDIS_PORT}"
echo "  - Elasticsearch: http://localhost:${ELASTICSEARCH_PORT}"
echo "  - Kibana: http://localhost:${KIBANA_PORT}"
echo "  - MailHog: http://localhost:8025"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Grafana: http://localhost:3001 (admin/grafana_admin_2024)"
fi
echo ""
echo "🔍 Check service status: docker-compose ps"
echo "📋 View logs: docker-compose logs -f [service_name]"
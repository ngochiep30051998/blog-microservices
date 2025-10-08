# Hướng Dẫn Setup Docker/Kafka/Database với Docker Compose

## Bước 1: Tạo cấu trúc thư mục dự án

```
blog-microservices/
├── docker-compose.yml
├── .env
├── scripts/
│   ├── start-dev.sh
│   ├── stop-dev.sh
│   └── kafka-topics.sh
├── docker/
│   ├── kafka/
│   │   └── create-topics.sh
│   └── init-scripts/
│       ├── init-postgres.sql
│       └── init-mongo.js
└── apps/
    ├── api-gateway/
    ├── user-service/
    ├── post-service/
    └── ...
```

## Bước 2: Tạo file .env

```bash
# Database Configuration
POSTGRES_USER=blog_user
POSTGRES_PASSWORD=blog_password_2024
POSTGRES_DB=blog_db
POSTGRES_PORT=5432

MONGO_USERNAME=mongo_user
MONGO_PASSWORD=mongo_password_2024
MONGO_DATABASE=blog_comments
MONGO_PORT=27017

REDIS_PASSWORD=redis_password_2024
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKER_ID=1
KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
KAFKA_PORT=9092
KAFKA_UI_PORT=8080

# Elasticsearch Configuration
ELASTIC_PASSWORD=elastic_password_2024
ELASTICSEARCH_PORT=9200
KIBANA_PORT=5601

# Application Ports
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
POST_SERVICE_PORT=3002
COMMENT_SERVICE_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
ANALYTICS_SERVICE_PORT=3005

# JWT Configuration
JWT_SECRET=super-secret-jwt-key-2024-blog-microservices
JWT_expiresIn=24h

# External Services
SMTP_HOST=localhost
SMTP_PORT=1025
```

## Bước 3: Tạo docker-compose.yml

```yaml
version: '3.8'

services:
  # =================
  # MESSAGE BROKER
  # =================
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    hostname: zookeeper
    container_name: zookeeper
    restart: unless-stopped
    ports:
      - "${ZOOKEEPER_PORT:-2181}:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_SYNC_LIMIT: 2
      ZOOKEEPER_INIT_LIMIT: 10
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
      - zookeeper_logs:/var/lib/zookeeper/log
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "2181"]
      interval: 30s
      timeout: 10s
      retries: 3

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    hostname: kafka
    container_name: kafka
    restart: unless-stopped
    depends_on:
      zookeeper:
        condition: service_healthy
    ports:
      - "${KAFKA_PORT}:9092"
    environment:
      KAFKA_BROKER_ID: ${KAFKA_BROKER_ID}
      KAFKA_ZOOKEEPER_CONNECT: ${KAFKA_ZOOKEEPER_CONNECT}
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://${KAFKA_ADVERTISED_LISTENERS}
      KAFKA_METRIC_REPORTERS: io.confluent.metrics.reporter.ConfluentMetricsReporter
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: kafka:29092
      KAFKA_CONFLUENT_METRICS_REPORTER_TOPIC_REPLICAS: 1
      KAFKA_CONFLUENT_METRICS_ENABLE: 'true'
      KAFKA_CONFLUENT_SUPPORT_CUSTOMER_ID: anonymous
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_RETENTION_BYTES: 1073741824
    volumes:
      - kafka_data:/var/lib/kafka/data
      - ./docker/kafka/create-topics.sh:/opt/kafka/create-topics.sh
    healthcheck:
      test: ["CMD", "kafka-topics", "--bootstrap-server", "localhost:9092", "--list"]
      interval: 30s
      timeout: 10s
      retries: 5

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    restart: unless-stopped
    depends_on:
      kafka:
        condition: service_healthy
    ports:
      - "${KAFKA_UI_PORT}:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181

  # =================
  # DATABASES
  # =================
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-scripts/init-postgres.sql:/docker-entrypoint-initdb.d/init-postgres.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:6.0
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DATABASE}
    ports:
      - "${MONGO_PORT}:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
      - ./docker/init-scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    healthcheck:
      test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # =================
  # SEARCH ENGINE
  # =================
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.9.0
    container_name: elasticsearch
    restart: unless-stopped
    environment:
      - node.name=elasticsearch
      - cluster.name=blog-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - "${ELASTICSEARCH_PORT}:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.9.0
    container_name: kibana
    restart: unless-stopped
    depends_on:
      elasticsearch:
        condition: service_healthy
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - xpack.security.enabled=false
    ports:
      - "${KIBANA_PORT}:5601"
    volumes:
      - kibana_data:/usr/share/kibana/data

  # =================
  # DEVELOPMENT TOOLS
  # =================
  mailhog:
    image: mailhog/mailhog:latest
    container_name: mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

  # =================
  # MONITORING (Optional - chỉ cho development)
  # =================
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./docker/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=grafana_admin_2024
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/monitoring/grafana/provisioning:/etc/grafana/provisioning

# =================
# VOLUMES
# =================
volumes:
  zookeeper_data:
    driver: local
  zookeeper_logs:
    driver: local
  kafka_data:
    driver: local
  postgres_data:
    driver: local
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local
  redis_data:
    driver: local
  elasticsearch_data:
    driver: local
  kibana_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

# =================
# NETWORKS
# =================
networks:
  default:
    name: blog-microservices-network
    driver: bridge
```

## Bước 4: Tạo init scripts

### docker/init-scripts/init-postgres.sql
```sql
-- Tạo database cho các services
CREATE DATABASE blog_users;
CREATE DATABASE blog_posts;

-- Tạo user riêng cho mỗi service
CREATE USER user_service_db WITH PASSWORD 'user_service_pass_2024';
CREATE USER post_service_db WITH PASSWORD 'post_service_pass_2024';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE blog_users TO user_service_db;
GRANT ALL PRIVILEGES ON DATABASE blog_posts TO post_service_db;

-- Enable UUID extension
\c blog_users;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c blog_posts;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### docker/init-scripts/init-mongo.js
```javascript
// Tạo database và collections cho Comment Service
db = db.getSiblingDB('blog_comments');

// Tạo user cho comment service
db.createUser({
  user: 'comment_service_user',
  pwd: 'comment_service_pass_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'blog_comments'
    }
  ]
});

// Tạo collections với indexes
db.createCollection('comments');
db.comments.createIndex({ "postId": 1 });
db.comments.createIndex({ "parentId": 1 });
db.comments.createIndex({ "authorId": 1 });
db.comments.createIndex({ "createdAt": -1 });

// Tạo collection cho moderation
db.createCollection('comment_moderation');
db.comment_moderation.createIndex({ "commentId": 1 });
db.comment_moderation.createIndex({ "status": 1 });
```

### docker/kafka/create-topics.sh
```bash
#!/bin/bash

# Chờ Kafka ready
echo "Waiting for Kafka to be ready..."
until kafka-topics --bootstrap-server kafka:29092 --list > /dev/null 2>&1; do
  echo "Kafka is not ready yet, waiting..."
  sleep 2
done

echo "Creating Kafka topics..."

# Tạo các topics chính
kafka-topics --bootstrap-server kafka:29092 --create --topic user.events --partitions 3 --replication-factor 1 --if-not-exists
kafka-topics --bootstrap-server kafka:29092 --create --topic post.events --partitions 3 --replication-factor 1 --if-not-exists  
kafka-topics --bootstrap-server kafka:29092 --create --topic comment.events --partitions 3 --replication-factor 1 --if-not-exists
kafka-topics --bootstrap-server kafka:29092 --create --topic notification.events --partitions 3 --replication-factor 1 --if-not-exists
kafka-topics --bootstrap-server kafka:29092 --create --topic analytics.events --partitions 6 --replication-factor 1 --if-not-exists

# Tạo DLQ topics cho error handling
kafka-topics --bootstrap-server kafka:29092 --create --topic user.events.dlq --partitions 1 --replication-factor 1 --if-not-exists
kafka-topics --bootstrap-server kafka:29092 --create --topic post.events.dlq --partitions 1 --replication-factor 1 --if-not-exists
kafka-topics --bootstrap-server kafka:29092 --create --topic comment.events.dlq --partitions 1 --replication-factor 1 --if-not-exists

echo "Kafka topics created successfully!"

# List all topics
echo "Current topics:"
kafka-topics --bootstrap-server kafka:29092 --list
```

## Bước 5: Tạo management scripts

### scripts/start-dev.sh
```bash
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
    echo "  - Grafana: http://localhost:9001 (admin/grafana_admin_2024)"
fi
echo ""
echo "🔍 Check service status: docker-compose ps"
echo "📋 View logs: docker-compose logs -f [service_name]"
```

### scripts/stop-dev.sh  
```bash
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
```

### scripts/health-check.sh
```bash
#!/bin/bash

echo "🏥 Checking service health..."

services=("zookeeper:2181" "kafka:9092" "postgres:5432" "mongodb:27017" "redis:6379" "elasticsearch:9200")

for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    name=${ADDR[0]}
    port=${ADDR[1]}
    
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
```

## Bước 6: Chạy và kiểm tra setup

### 1. Khởi động environment
```bash
# Cấp quyền execute cho scripts
chmod +x scripts/*.sh
chmod +x docker/kafka/create-topics.sh

# Khởi động development environment  
./scripts/start-dev.sh
```

### 2. Kiểm tra health
```bash
# Kiểm tra status các services
docker-compose ps

# Kiểm tra logs nếu có service lỗi
docker-compose logs kafka

# Chạy health check
./scripts/health-check.sh
```

### 3. Test kết nối
```bash
# Test Kafka
docker-compose exec kafka kafka-console-producer --bootstrap-server localhost:9092 --topic user.events

# Test PostgreSQL
docker-compose exec postgres psql -U blog_user -d blog_db -c "SELECT version();"

# Test MongoDB  
docker-compose exec mongodb mongo -u mongo_user -p mongo_password_2024 --eval "db.version()"

# Test Redis
docker-compose exec redis redis-cli -a redis_password_2024 ping

# Test Elasticsearch
curl http://localhost:9200/_cluster/health?pretty
```

## Bước 7: Troubleshooting

### Common Issues:

**Port conflicts:**
```bash
# Kiểm tra ports đang sử dụng
netstat -tulpn | grep LISTEN

# Thay đổi ports trong .env file nếu cần
```

**Memory issues:**
```bash
# Tăng Docker memory limit (minimum 4GB recommended)
# Docker Desktop → Settings → Resources → Memory

# Giảm Elasticsearch heap size trong docker-compose.yml:
# "ES_JAVA_OPTS=-Xms256m -Xmx256m"
```

**Kafka connection issues:**
```bash
# Kiểm tra Kafka logs
docker-compose logs kafka

# Restart Kafka cluster
docker-compose restart zookeeper kafka
sleep 30
docker-compose exec kafka /opt/kafka/create-topics.sh
```

Sau khi hoàn thành setup này, bạn sẽ có một môi trường phát triển đầy đủ với tất cả infrastructure cần thiết cho blog microservices system!
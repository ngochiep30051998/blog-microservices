#!/bin/bash

# Script to create all required Kafka topics for the blog microservices platform

echo "🚀 Creating Kafka topics for blog microservices..."

# Check if Kafka is running
if ! docker ps | grep -q kafka; then
    echo "❌ Kafka is not running. Please start docker-compose:"
    echo "   docker-compose up -d"
    exit 1
fi

# Function to create topic if it doesn't exist
create_topic_if_not_exists() {
    local topic=$1
    local partitions=${2:-3}
    local replication=${3:-1}
    
    if docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list | grep -q "^${topic}$"; then
        echo "✅ Topic '${topic}' already exists"
    else
        echo "📝 Creating topic '${topic}'..."
        docker exec kafka kafka-topics \
            --bootstrap-server localhost:9092 \
            --create \
            --topic "${topic}" \
            --partitions ${partitions} \
            --replication-factor ${replication}
        
        if [ $? -eq 0 ]; then
            echo "✅ Topic '${topic}' created successfully"
        else
            echo "❌ Failed to create topic '${topic}'"
            exit 1
        fi
    fi
}

# Create main event topics
echo ""
echo "📋 Creating main event topics..."
create_topic_if_not_exists "user.events"
create_topic_if_not_exists "post.events" 
create_topic_if_not_exists "comment.events"
create_topic_if_not_exists "notification.events"
create_topic_if_not_exists "analytics.events"
create_topic_if_not_exists "file.events"

# Create dead letter queue topics
echo ""
echo "🪦 Creating dead letter queue topics..."
create_topic_if_not_exists "user.events.dlq"
create_topic_if_not_exists "post.events.dlq"
create_topic_if_not_exists "comment.events.dlq"
create_topic_if_not_exists "notification.events.dlq"
create_topic_if_not_exists "analytics.events.dlq"
create_topic_if_not_exists "file.events.dlq"

echo ""
echo "📊 Current topics:"
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list

echo ""
echo "✅ All Kafka topics created successfully!"
echo ""
echo "🔍 To monitor file events:"
echo "   docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic file.events --from-beginning"
echo ""
echo "🚀 You can now start the files-service:"
echo "   nx serve files-service"
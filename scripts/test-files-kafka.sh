#!/bin/bash

# Test script for files-service Kafka integration

echo "🧪 Testing Files Service Kafka Integration..."

# Start Kafka topics creation if needed
echo "📝 Creating Kafka topics..."
cd /Users/nguyenhiep/Desktop/projects/blog-microservices

# Check if docker-compose is running
if ! docker ps | grep -q kafka; then
    echo "⚠️  Kafka is not running. Please start docker-compose first:"
    echo "   docker-compose up -d"
    exit 1
fi

# Create the file events topic if it doesn't exist
docker exec -it blog-microservices-kafka-1 kafka-topics.sh \
  --create \
  --topic file.events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists

echo "✅ Kafka topics created successfully"
echo "🚀 You can now test the files service!"
echo ""
echo "To run the files service:"
echo "   nx serve files-service"
echo ""
echo "The service will:"
echo "   - Connect to Kafka on startup"
echo "   - Initialize consumers for user.events and post.events"
echo "   - Publish events when files are uploaded/updated/deleted/viewed"
echo ""
echo "Monitor Kafka messages with:"
echo "   docker exec -it blog-microservices-kafka-1 kafka-console-consumer.sh \\"
echo "     --bootstrap-server localhost:9092 \\"
echo "     --topic file.events \\"
echo "     --from-beginning"
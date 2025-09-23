#!/bin/bash

# Kafka Consumer Group Debug Script for Files Service

echo "🔍 Debugging Kafka Consumer Group Issues..."

# Check if Kafka is running
if ! docker ps | grep -q kafka; then
    echo "❌ Kafka is not running. Please start docker-compose:"
    echo "   docker-compose up -d"
    exit 1
fi

echo "✅ Kafka is running"

# Function to run kafka commands
run_kafka_cmd() {
    docker exec -it blog-microservices-kafka-1 "$@"
}

echo ""
echo "📋 Checking consumer groups..."
run_kafka_cmd kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

echo ""
echo "📊 Checking files-service consumer group details..."
run_kafka_cmd kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group files-service-consumers

echo ""
echo "📊 Checking topic details..."
run_kafka_cmd kafka-topics.sh --bootstrap-server localhost:9092 --list

echo ""
echo "🔍 Checking if topics exist..."
for topic in "user.events" "post.events" "file.events"; do
    if run_kafka_cmd kafka-topics.sh --bootstrap-server localhost:9092 --list | grep -q "^$topic$"; then
        echo "✅ Topic '$topic' exists"
        run_kafka_cmd kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic "$topic"
    else
        echo "❌ Topic '$topic' does not exist - creating it..."
        run_kafka_cmd kafka-topics.sh --bootstrap-server localhost:9092 --create --topic "$topic" --partitions 3 --replication-factor 1
    fi
    echo ""
done

echo ""
echo "🧹 OPTIONAL: Reset consumer group (USE WITH CAUTION)..."
echo "This will reset the consumer group offset. Only run if you're sure:"
echo ""
echo "docker exec -it blog-microservices-kafka-1 kafka-consumer-groups.sh \\"
echo "  --bootstrap-server localhost:9092 \\"
echo "  --group files-service-consumers \\"
echo "  --reset-offsets \\"
echo "  --to-earliest \\"
echo "  --all-topics \\"
echo "  --execute"

echo ""
echo "🔧 Tips to prevent rebalancing issues:"
echo "1. Ensure only one instance of files-service is running"
echo "2. Check if consumer sessions are timing out (check logs)"
echo "3. Verify network connectivity to Kafka"
echo "4. Monitor consumer lag: "
echo "   docker exec -it blog-microservices-kafka-1 kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group files-service-consumers"

echo ""
echo "🚀 Ready to test! Start files-service with:"
echo "   nx serve files-service"
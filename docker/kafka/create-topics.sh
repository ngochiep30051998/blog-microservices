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
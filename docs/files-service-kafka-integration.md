# Files Service Kafka Integration

## Overview

The Files Service has been successfully integrated with Kafka to enable real-time event-driven communication with other microservices in the blog platform.

## Features Implemented

### 1. Kafka Event Production
The Files Service now publishes events for the following operations:
- **File Upload Started** (`file.processing_started`)
- **File Upload Completed** (`file.uploaded` & `file.processing_completed`)
- **File Upload Failed** (`file.processing_failed`)
- **File Updated** (`file.updated`)
- **File Deleted** (`file.deleted`)
- **File Viewed** (`file.viewed`)

### 2. Kafka Event Consumption
The Files Service listens to events from other services:
- **User Events** (`user.events`) - For handling user deletions and cleanup
- **Post Events** (`post.events`) - For handling post deletions and file associations

### 3. Event Data Structure
All file events follow a standardized structure:

```typescript
interface FileEventData {
  fileId: string;
  fileName: string;
  fileType: FileType;
  status: UploadStatus;
  uploadedBy: string;
  uploadedByName?: string;
  size: number;
  mimetype: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  relatedPostId?: string;
  relatedCategoryId?: string;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    compressionRatio?: number;
    tags?: string[];
  };
}
```

## Technical Implementation

### 1. New Services Added

#### `KafkaEventsService`
- Located at: `apps/files-service/src/services/kafka-events.service.ts`
- Handles all Kafka operations for the files service
- Provides methods for publishing file-related events
- Manages consumer setup for external events

#### `AppInitService`
- Located at: `apps/files-service/src/services/app-init.service.ts`
- Initializes Kafka consumers on application startup
- Ensures proper service initialization order

### 2. Updated Files

#### `libs/shared/kafka/src/lib/kafka.constants.ts`
- Added `FILE_EVENTS` topic
- Added `FILE_EVENT_TYPES` constants
- Added `FILES_SERVICE` consumer group

#### `apps/files-service/src/services/files.service.ts`
- Integrated Kafka event publishing in all file operations
- Added error handling for Kafka operations (non-blocking)

#### `apps/files-service/src/app/app.module.ts`
- Added `KafkaModule` import
- Added `KafkaEventsService` and `AppInitService` providers

### 3. Kafka Topics

#### `file.events`
Primary topic for all file-related events:
- Partitioned for scalability
- Contains all file lifecycle events
- Consumed by analytics, notification, and other services

## Event Flow Examples

### File Upload Flow
1. **File Upload Request** → API Controller
2. **Processing Started Event** → Kafka (`file.processing_started`)
3. **Cloudinary Upload** → External Service
4. **Processing Completed Event** → Kafka (`file.processing_completed`)
5. **File Uploaded Event** → Kafka (`file.uploaded`)

### File Deletion Flow
1. **Delete Request** → API Controller
2. **Soft Delete** → Database Update
3. **File Deleted Event** → Kafka (`file.deleted`)
4. **Cloudinary Cleanup** → Background Process

### File View Flow
1. **File Access Request** → API Controller
2. **View Count Update** → Database
3. **File Viewed Event** → Kafka (`file.viewed`)

## Integration with Other Services

### Analytics Service
- Consumes `file.uploaded`, `file.viewed`, `file.deleted` events
- Tracks file usage statistics
- Generates reports on file performance

### Notification Service
- Consumes `file.uploaded` events
- Sends notifications to users about successful uploads
- Handles processing failure notifications

### Post Service
- Consumes `file.deleted` events
- Updates post content when associated files are removed
- Manages file-post relationships

## Configuration

### Environment Variables
Ensure these Kafka configuration variables are set:

```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=files-service
```

### Docker Compose
The existing docker-compose setup includes:
- Kafka broker
- Zookeeper
- Topic auto-creation

## Testing

### Running the Service
```bash
# Start infrastructure
docker-compose up -d

# Start files service
nx serve files-service
```

### Monitoring Events
```bash
# Monitor file events
docker exec -it blog-microservices-kafka-1 kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic file.events \
  --from-beginning
```

### Test Script
Use the provided test script:
```bash
./scripts/test-files-kafka.sh
```

## Error Handling

### Kafka Connection Issues
- Non-blocking: File operations continue even if Kafka is unavailable
- Logging: All Kafka errors are logged for monitoring
- Retry: Built-in retry mechanism in KafkaService

### Event Publishing Failures
- Warning logs for failed event publishing
- File operations are not rolled back due to Kafka failures
- Events are not queued for retry (fire-and-forget approach)

## Performance Considerations

### Event Volume
- File upload events are relatively low-frequency
- View events could be high-volume (consider batching in future)
- All events are published asynchronously

### Resource Usage
- Minimal impact on file upload performance
- Kafka consumers use separate thread pools
- Connection pooling for efficient resource usage

## Future Enhancements

1. **Dead Letter Queue (DLQ)** - Already implemented for failed message processing
2. **Event Replay** - Kafka retention allows historical event replay
3. **Schema Registry** - For better event schema management
4. **Metrics** - Kafka metrics integration with monitoring tools
5. **Batching** - For high-volume events like file views

## Troubleshooting

### Common Issues

1. **Kafka Not Connected**
   ```
   Error: Failed to initialize Kafka consumers
   ```
   - Check Kafka is running: `docker ps | grep kafka`
   - Verify network connectivity
   - Check environment variables

2. **Topic Creation Failed**
   ```
   Error: Topic does not exist
   ```
   - Run topic creation script
   - Check Kafka broker configuration
   - Verify auto-topic-creation settings

3. **Consumer Group Issues**
   ```
   Error: Consumer already exists
   ```
   - Check for multiple service instances
   - Verify unique consumer group IDs
   - Reset consumer group if needed

### Debugging Commands

```bash
# List topics
docker exec -it blog-microservices-kafka-1 kafka-topics.sh --list --bootstrap-server localhost:9092

# Check consumer groups
docker exec -it blog-microservices-kafka-1 kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# View topic details
docker exec -it blog-microservices-kafka-1 kafka-topics.sh --describe --topic file.events --bootstrap-server localhost:9092
```

## Summary

The Files Service Kafka integration provides:
- ✅ Real-time event publishing for all file operations
- ✅ Consumer setup for external service events
- ✅ Robust error handling and logging
- ✅ Non-blocking operation (files work even if Kafka is down)
- ✅ Scalable event-driven architecture
- ✅ Integration with existing shared Kafka infrastructure

The implementation follows best practices and is ready for production use.
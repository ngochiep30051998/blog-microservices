import { Injectable, Logger } from '@nestjs/common';
import { KafkaService, EventPayload } from '@blog/shared/kafka';
import { 
  KAFKA_TOPICS, 
  FILE_EVENT_TYPES, 
  CONSUMER_GROUPS 
} from '@blog/shared/kafka';
import { FileUploadDocument, FileType, UploadStatus } from '../entities/file-upload.entity';

export interface FileEventData {
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

@Injectable()
export class KafkaEventsService {
  private readonly logger = new Logger(KafkaEventsService.name);

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Initialize Kafka consumers for files service
   */
  async initializeConsumers(): Promise<void> {
    try {
      // Subscribe to user events (for handling user deletions, etc.)
      await this.kafkaService.subscribe(
        KAFKA_TOPICS.USER_EVENTS,
        this.handleUserEvent.bind(this),
        {
          groupId: CONSUMER_GROUPS.FILES_SERVICE,
          fromBeginning: false,
          sessionTimeout: 60000, // 60 seconds
          heartbeatInterval: 20000, // 20 seconds
          autoCommit: true,
        }
      );

      // Subscribe to post events (for handling post deletions, etc.)
      await this.kafkaService.subscribe(
        KAFKA_TOPICS.POST_EVENTS,
        this.handlePostEvent.bind(this),
        {
          groupId: CONSUMER_GROUPS.FILES_SERVICE,
          fromBeginning: false,
          sessionTimeout: 60000, // 60 seconds  
          heartbeatInterval: 20000, // 20 seconds
          autoCommit: true,
        }
      );

      this.logger.log('✅ Kafka consumers initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka consumers:', error);
      throw error;
    }
  }

  /**
   * Publish file uploaded event
   */
  async publishFileUploadedEvent(fileDocument: FileUploadDocument): Promise<void> {
    const eventData: FileEventData = {
      fileId: fileDocument._id.toString(),
      fileName: fileDocument.filename,
      fileType: fileDocument.type,
      status: fileDocument.status,
      uploadedBy: fileDocument.uploadedBy,
      uploadedByName: fileDocument.uploadedByName,
      size: fileDocument.size,
      mimetype: fileDocument.mimetype,
      cloudinaryUrl: fileDocument.cloudinaryUrl,
      cloudinaryPublicId: fileDocument.cloudinaryPublicId,
      relatedPostId: fileDocument.relatedPostId,
      relatedCategoryId: fileDocument.relatedCategoryId,
      metadata: {
        width: fileDocument.width,
        height: fileDocument.height,
        format: fileDocument.format,
        compressionRatio: fileDocument.compressionRatio,
        tags: fileDocument.tags,
      },
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.UPLOADED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileDocument._id.toString(),
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileDocument._id.toString(), event);
    this.logger.log(`📤 File uploaded event published: ${fileDocument.filename}`);
  }

  /**
   * Publish file processing started event
   */
  async publishFileProcessingStartedEvent(fileDocument: FileUploadDocument): Promise<void> {
    const eventData: FileEventData = {
      fileId: fileDocument._id.toString(),
      fileName: fileDocument.filename,
      fileType: fileDocument.type,
      status: UploadStatus.UPLOADING,
      uploadedBy: fileDocument.uploadedBy,
      uploadedByName: fileDocument.uploadedByName,
      size: fileDocument.size,
      mimetype: fileDocument.mimetype,
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.PROCESSING_STARTED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileDocument._id.toString(),
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileDocument._id.toString(), event);
    this.logger.log(`📤 File processing started event published: ${fileDocument.filename}`);
  }

  /**
   * Publish file processing completed event
   */
  async publishFileProcessingCompletedEvent(fileDocument: FileUploadDocument): Promise<void> {
    const eventData: FileEventData = {
      fileId: fileDocument._id.toString(),
      fileName: fileDocument.filename,
      fileType: fileDocument.type,
      status: fileDocument.status,
      uploadedBy: fileDocument.uploadedBy,
      uploadedByName: fileDocument.uploadedByName,
      size: fileDocument.size,
      mimetype: fileDocument.mimetype,
      cloudinaryUrl: fileDocument.cloudinaryUrl,
      cloudinaryPublicId: fileDocument.cloudinaryPublicId,
      relatedPostId: fileDocument.relatedPostId,
      relatedCategoryId: fileDocument.relatedCategoryId,
      metadata: {
        width: fileDocument.width,
        height: fileDocument.height,
        format: fileDocument.format,
        compressionRatio: fileDocument.compressionRatio,
        tags: fileDocument.tags,
      },
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.PROCESSING_COMPLETED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileDocument._id.toString(),
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileDocument._id.toString(), event);
    this.logger.log(`📤 File processing completed event published: ${fileDocument.filename}`);
  }

  /**
   * Publish file processing failed event
   */
  async publishFileProcessingFailedEvent(fileDocument: FileUploadDocument, error: string): Promise<void> {
    const eventData: FileEventData = {
      fileId: fileDocument._id.toString(),
      fileName: fileDocument.filename,
      fileType: fileDocument.type,
      status: UploadStatus.FAILED,
      uploadedBy: fileDocument.uploadedBy,
      uploadedByName: fileDocument.uploadedByName,
      size: fileDocument.size,
      mimetype: fileDocument.mimetype,
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.PROCESSING_FAILED,
      data: { ...eventData, error },
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileDocument._id.toString(),
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileDocument._id.toString(), event);
    this.logger.error(`📤 File processing failed event published: ${fileDocument.filename}, Error: ${error}`);
  }

  /**
   * Publish file deleted event
   */
  async publishFileDeletedEvent(fileId: string, fileName: string, uploadedBy: string): Promise<void> {
    const eventData = {
      fileId,
      fileName,
      uploadedBy,
      deletedAt: new Date().toISOString(),
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.DELETED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileId,
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileId, event);
    this.logger.log(`📤 File deleted event published: ${fileName}`);
  }

  /**
   * Publish file updated event
   */
  async publishFileUpdatedEvent(fileDocument: FileUploadDocument): Promise<void> {
    const eventData: FileEventData = {
      fileId: fileDocument._id.toString(),
      fileName: fileDocument.filename,
      fileType: fileDocument.type,
      status: fileDocument.status,
      uploadedBy: fileDocument.uploadedBy,
      uploadedByName: fileDocument.uploadedByName,
      size: fileDocument.size,
      mimetype: fileDocument.mimetype,
      cloudinaryUrl: fileDocument.cloudinaryUrl,
      cloudinaryPublicId: fileDocument.cloudinaryPublicId,
      relatedPostId: fileDocument.relatedPostId,
      relatedCategoryId: fileDocument.relatedCategoryId,
      metadata: {
        width: fileDocument.width,
        height: fileDocument.height,
        format: fileDocument.format,
        compressionRatio: fileDocument.compressionRatio,
        tags: fileDocument.tags,
      },
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.UPDATED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileDocument._id.toString(),
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileDocument._id.toString(), event);
    this.logger.log(`📤 File updated event published: ${fileDocument.filename}`);
  }

  /**
   * Publish file viewed event
   */
  async publishFileViewedEvent(fileId: string, fileName: string, viewedBy?: string): Promise<void> {
    const eventData = {
      fileId,
      fileName,
      viewedBy,
      viewedAt: new Date().toISOString(),
    };

    const event: EventPayload = {
      type: FILE_EVENT_TYPES.VIEWED,
      data: eventData,
      timestamp: Date.now(),
      source: 'files-service',
      correlationId: fileId,
    };

    await this.kafkaService.publishEvent(KAFKA_TOPICS.FILE_EVENTS, fileId, event);
    this.logger.debug(`📤 File viewed event published: ${fileName}`);
  }

  /**
   * Handle user events from other services
   */
  private async handleUserEvent(payload: EventPayload): Promise<void> {
    try {
      this.logger.log(`📥 Received user event: ${payload.type}`);
      
      // Handle user deleted event - mark files as orphaned or handle cleanup
      if (payload.type === 'user.deleted') {
        const { userId } = payload.data;
        this.logger.log(`🔄 Processing user deletion for files owned by user: ${userId}`);
        
        // Here you could implement logic to:
        // - Mark files as orphaned
        // - Transfer ownership
        // - Delete files based on business rules
        // This is a placeholder for now
      }
    } catch (error) {
      this.logger.error(`❌ Error processing user event: ${payload.type}`, error);
    }
  }

  /**
   * Handle post events from other services
   */
  private async handlePostEvent(payload: EventPayload): Promise<void> {
    try {
      this.logger.log(`📥 Received post event: ${payload.type}`);
      
      // Handle post deleted event - handle cleanup of associated files
      if (payload.type === 'post.deleted') {
        const { postId } = payload.data;
        this.logger.log(`🔄 Processing post deletion for associated files: ${postId}`);
        
        // Here you could implement logic to:
        // - Mark files as unassociated from the post
        // - Delete files if they were only associated with this post
        // - Update file metadata
        // This is a placeholder for now
      }
    } catch (error) {
      this.logger.error(`❌ Error processing post event: ${payload.type}`, error);
    }
  }
}
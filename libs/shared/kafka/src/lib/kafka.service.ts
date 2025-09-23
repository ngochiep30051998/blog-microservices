import { Injectable, Logger, OnModuleDestroy, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Kafka, 
  Producer, 
  Consumer, 
  EachMessagePayload, 
  KafkaMessage,
  ProducerRecord,
  ConsumerConfig,
  ProducerConfig
} from 'kafkajs';

export interface EventPayload {
  type: string;
  data: any;
  timestamp?: number;
  correlationId?: string;
  version?: string;
  source?: string;
}

export interface KafkaSubscriptionHandler {
  (payload: EventPayload, rawMessage: KafkaMessage): Promise<void>;
}

export interface SubscriptionOptions {
  groupId: string;
  fromBeginning?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxWaitTimeInMs?: number;
  minBytes?: number;
  maxBytes?: number;
  autoCommit?: boolean;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private isConnected = false;
  private subscriptions: Map<string, SubscriptionOptions> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeKafka();
  }

  /**
   * Initialize Kafka client
   */
  private initializeKafka(): void {
    const clientId = this.configService.get('KAFKA_CLIENT_ID', 'blog-microservices');
    const brokers = this.configService.get('KAFKA_BROKERS', 'localhost:9092').split(',');
    
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
        factor: 2,
        multiplier: 2,
      },
      connectionTimeout: 10000,
      requestTimeout: 30000,
      logLevel: this.getKafkaLogLevel(),
    });

    // Producer configuration
    const producerConfig: ProducerConfig = {
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      maxInFlightRequests: 5,
      idempotent: true,
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
      },
    };

    this.producer = this.kafka.producer(producerConfig);

    this.logger.log(`Kafka client initialized with brokers: ${brokers.join(', ')}`);
  }

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connectProducer();
      this.isConnected = true;
      this.logger.log('✅ Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  /**
   * Module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Application shutdown
   */
  async onApplicationShutdown(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect producer
   */
  private async connectProducer(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.log('📤 Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Publish event to Kafka topic
   */
  async publishEvent(
    topic: string,
    key: string,
    payload: EventPayload,
    partition?: number
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka service is not connected');
    }

    try {
      const enrichedPayload: EventPayload = {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
        correlationId: payload.correlationId || this.generateCorrelationId(),
        version: payload.version || '1.0',
        source: payload.source || this.configService.get('KAFKA_CLIENT_ID', 'unknown'),
      };

      const message = {
        key,
        value: JSON.stringify(enrichedPayload),
        partition,
        headers: {
          'content-type': 'application/json',
          'correlation-id': enrichedPayload.correlationId!,
          'event-type': payload.type,
          'event-version': enrichedPayload.version!,
          'event-source': enrichedPayload.source!,
          'published-at': new Date().toISOString(),
        },
        timestamp: enrichedPayload.timestamp!.toString(),
      };

      const producerRecord: ProducerRecord = {
        topic,
        messages: [message],
      };

      const result = await this.producer.send(producerRecord);
      
      this.logger.log(
        `📤 Event published to ${topic}[${result[0].partition}] offset ${result[0].baseOffset}: ${payload.type}`
      );

    } catch (error: any) {
      // Check if it's a topic-related error and provide helpful message
      if (error?.message && error.message.includes('topic-partition')) {
        this.logger.error(
          `❌ Topic '${topic}' does not exist. Please create it with: ` +
          `docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic ${topic} --partitions 3 --replication-factor 1`
        );
      }
      this.logger.error(`Failed to publish event to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(
    topic: string,
    events: Array<{ key: string; payload: EventPayload; partition?: number }>
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka service is not connected');
    }

    try {
      const messages = events.map(({ key, payload, partition }) => {
        const enrichedPayload: EventPayload = {
          ...payload,
          timestamp: payload.timestamp || Date.now(),
          correlationId: payload.correlationId || this.generateCorrelationId(),
          version: payload.version || '1.0',
          source: payload.source || this.configService.get('KAFKA_CLIENT_ID', 'unknown'),
        };

        return {
          key,
          value: JSON.stringify(enrichedPayload),
          partition,
          headers: {
            'content-type': 'application/json',
            'correlation-id': enrichedPayload.correlationId!,
            'event-type': payload.type,
            'event-version': enrichedPayload.version!,
            'event-source': enrichedPayload.source!,
            'published-at': new Date().toISOString(),
          },
          timestamp: enrichedPayload.timestamp!.toString(),
        };
      });

      const result = await this.producer.send({
        topic,
        messages,
      });

      this.logger.log(`📤 Batch published ${events.length} events to ${topic}`);

    } catch (error) {
      this.logger.error(`Failed to publish batch to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to Kafka topic
   */
  async subscribe(
    topic: string,
    handler: KafkaSubscriptionHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    const consumerKey = `${topic}-${options.groupId}`;
    
    if (this.consumers.has(consumerKey)) {
      this.logger.warn(`Consumer already exists for ${consumerKey}, skipping subscription`);
      return;
    }

    try {
      const consumerConfig: ConsumerConfig = {
        groupId: options.groupId,
        sessionTimeout: options.sessionTimeout || 60000, // Increased from 30s to 60s
        heartbeatInterval: options.heartbeatInterval || 20000, // Increased to 20s (should be 1/3 of session timeout)
        maxWaitTimeInMs: options.maxWaitTimeInMs || 5000,
        minBytes: options.minBytes || 1,
        maxBytes: options.maxBytes || 1048576, // 1MB
        allowAutoTopicCreation: true, // Changed to true to handle missing topics
        // Add rebalancing timeout to prevent frequent rebalances
        rebalanceTimeout: 60000, // 60 seconds
        retry: {
          initialRetryTime: 300,
          retries: 5,
          maxRetryTime: 30000,
        },
      };

      const consumer = this.kafka.consumer(consumerConfig);
      
      // Add consumer event listeners for better debugging
      consumer.on('consumer.group_join', (event) => {
        this.logger.log(`📥 Consumer joined group for topic: ${topic}`);
      });

      consumer.on('consumer.rebalancing', (event) => {
        this.logger.warn(`⚖️ Consumer group rebalancing for topic: ${topic}`);
      });

      consumer.on('consumer.connect', () => {
        this.logger.log(`🔗 Consumer connected for topic: ${topic}`);
      });

      consumer.on('consumer.disconnect', () => {
        this.logger.warn(`🔌 Consumer disconnected for topic: ${topic}`);
      });

      await consumer.connect();

      await consumer.subscribe({ 
        topic, 
        fromBeginning: options.fromBeginning || false 
      });

      await consumer.run({
        autoCommit: options.autoCommit !== false,
        autoCommitInterval: 5000, // Commit every 5 seconds
        eachMessage: async (messagePayload: EachMessagePayload) => {
          await this.processMessage(messagePayload, handler, topic);
        },
      });

      this.consumers.set(consumerKey, consumer);
      this.subscriptions.set(consumerKey, options);

      this.logger.log(`📥 Subscribed to topic ${topic} with group ${options.groupId}`);

    } catch (error: any) {
      // Provide helpful error messages for common issues
      if (error?.message && error.message.includes('topic-partition')) {
        this.logger.error(
          `❌ Topic '${topic}' does not exist. Please create it with: ` +
          `docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic ${topic} --partitions 3 --replication-factor 1`
        );
      } else if (error?.message && error.message.includes('rebalancing')) {
        this.logger.error(
          `⚖️ Consumer group rebalancing issue for topic '${topic}'. ` +
          `This might be due to multiple consumers with the same group ID or network issues.`
        );
      }
      this.logger.error(`Failed to subscribe to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(
    messagePayload: EachMessagePayload,
    handler: KafkaSubscriptionHandler,
    topic: string
  ): Promise<void> {
    const { message, partition, topic: msgTopic } = messagePayload;
    
    try {
      if (!message.value) {
        this.logger.warn(`Received empty message from ${topic}[${partition}]`);
        return;
      }

      const rawPayload = message.value.toString();
      const eventPayload: EventPayload = JSON.parse(rawPayload);

      // Validate payload
      if (!this.isValidEventPayload(eventPayload)) {
        this.logger.error(`Invalid event payload from ${topic}[${partition}]:`, rawPayload);
        return;
      }

      const correlationId = eventPayload.correlationId || 
        (message.headers?.['correlation-id']?.toString());

      this.logger.debug(
        `📥 Processing event ${eventPayload.type} from ${topic}[${partition}] offset ${message.offset}` +
        (correlationId ? ` (correlationId: ${correlationId})` : '')
      );

      // Call the handler
      await handler(eventPayload, message);

      this.logger.log(
        `✅ Processed event ${eventPayload.type} from ${topic}[${partition}] offset ${message.offset}`
      );

    } catch (error) {
      this.logger.error(
        `❌ Error processing message from ${topic}[${partition}] offset ${message.offset}:`,
        error
      );

      // Optionally send to dead letter queue
      await this.handleProcessingError(messagePayload, error);
    }
  }

  /**
   * Handle processing errors (could send to DLQ)
   */
  private async handleProcessingError(
    messagePayload: EachMessagePayload,
    error: any
  ): Promise<void> {
    const { topic, partition, message } = messagePayload;
    const dlqTopic = `${topic}.dlq`;

    try {
      // Send to dead letter queue
      await this.publishEvent(dlqTopic, message.key?.toString() || 'unknown', {
        type: 'processing_error',
        data: {
          originalTopic: topic,
          originalPartition: partition,
          originalOffset: message.offset,
          originalMessage: message.value?.toString(),
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
          },
        },
      });

      this.logger.log(`📮 Sent failed message to DLQ: ${dlqTopic}`);

    } catch (dlqError) {
      this.logger.error('Failed to send message to DLQ:', dlqError);
    }
  }

  /**
   * Validate event payload structure
   */
  private isValidEventPayload(payload: any): payload is EventPayload {
    return payload && 
           typeof payload === 'object' && 
           typeof payload.type === 'string' &&
           payload.data !== undefined;
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribe(topic: string, groupId: string): Promise<void> {
    const consumerKey = `${topic}-${groupId}`;
    const consumer = this.consumers.get(consumerKey);

    if (consumer) {
      try {
        await consumer.disconnect();
        this.consumers.delete(consumerKey);
        this.subscriptions.delete(consumerKey);
        this.logger.log(`📤 Unsubscribed from ${topic} (group: ${groupId})`);
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from ${topic}:`, error);
      }
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): Array<{ topic: string; groupId: string; options: SubscriptionOptions }> {
    return Array.from(this.subscriptions.entries()).map(([key, options]) => {
      const [topic] = key.split('-');
      return {
        topic,
        groupId: options.groupId,
        options,
      };
    });
  }

  /**
   * Check if service is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    producerConnected: boolean;
    activeConsumers: number;
    activeSubscriptions: string[];
  } {
    return {
      connected: this.isConnected,
      producerConnected: this.isConnected,
      activeConsumers: this.consumers.size,
      activeSubscriptions: Array.from(this.subscriptions.keys()),
    };
  }

  /**
   * Disconnect all connections
   */
  private async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    this.logger.log('🔌 Disconnecting Kafka service...');

    try {
      // Disconnect all consumers gracefully with timeout
      const consumerDisconnectPromises = Array.from(this.consumers.values()).map(
        async (consumer) => {
          try {
            // Give consumers time to commit offsets and leave groups gracefully
            await Promise.race([
              consumer.disconnect(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Consumer disconnect timeout')), 10000)
              )
            ]);
          } catch (error) {
            this.logger.warn('Consumer disconnect warning:', error);
          }
        }
      );
      
      await Promise.allSettled(consumerDisconnectPromises);
      
      this.consumers.clear();
      this.subscriptions.clear();

      // Disconnect producer with timeout
      try {
        await Promise.race([
          this.producer.disconnect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Producer disconnect timeout')), 5000)
          )
        ]);
      } catch (error) {
        this.logger.warn('Producer disconnect warning:', error);
      }
      
      this.isConnected = false;
      this.logger.log('✅ Kafka service disconnected successfully');

    } catch (error) {
      this.logger.error('❌ Error disconnecting Kafka service:', error);
      this.isConnected = false; // Set to false anyway to prevent hanging
    }
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Kafka log level from environment
   */
  private getKafkaLogLevel(): any {
    const level = this.configService.get('KAFKA_LOG_LEVEL', 'INFO').toUpperCase();
    const logLevelMap: Record<string, number> = {
      ERROR: 1,
      WARN: 2,
      INFO: 4,
      DEBUG: 5,
    };
    return logLevelMap[level] || 4;
  }
}

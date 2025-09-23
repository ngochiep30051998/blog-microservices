import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaEventsService } from './kafka-events.service';

@Injectable()
export class AppInitService implements OnModuleInit {
  private readonly logger = new Logger(AppInitService.name);

  constructor(private readonly kafkaEventsService: KafkaEventsService) {}

  async onModuleInit() {
    try {
      this.logger.log('🚀 Initializing Files Service...');
      
      // Initialize Kafka consumers
      await this.kafkaEventsService.initializeConsumers();
      
      this.logger.log('✅ Files Service initialization completed');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Files Service:', error);
      throw error;
    }
  }
}
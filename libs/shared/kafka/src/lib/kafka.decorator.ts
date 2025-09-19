import { SetMetadata } from '@nestjs/common';

export const KAFKA_SUBSCRIPTION_METADATA = 'kafka:subscription';

export interface KafkaSubscriptionMetadata {
  topic: string;
  groupId: string;
  fromBeginning?: boolean;
}

/**
 * Decorator to mark methods as Kafka event handlers
 */
export const KafkaSubscription = (options: KafkaSubscriptionMetadata) =>
  SetMetadata(KAFKA_SUBSCRIPTION_METADATA, options);

/**
 * Usage example:
 * 
 * @KafkaSubscription({
 *   topic: 'user.events',
 *   groupId: 'notification-service-consumers'
 * })
 * async handleUserEvent(payload: EventPayload) {
 *   // Handle the event
 * }
 */
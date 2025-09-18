export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId?: string;
}

export const getKafkaConfig = (serviceName: string): KafkaConfig => ({
  clientId: `${serviceName}-client`,
  brokers: (process.env["KAFKA_BROKERS"] || 'localhost:9092').split(','),
  groupId: `${serviceName}-consumer-group`,
});
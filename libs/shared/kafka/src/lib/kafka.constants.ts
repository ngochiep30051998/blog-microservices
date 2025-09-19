// Kafka topic names
export const KAFKA_TOPICS = {
  USER_EVENTS: 'user.events',
  POST_EVENTS: 'post.events', 
  COMMENT_EVENTS: 'comment.events',
  NOTIFICATION_EVENTS: 'notification.events',
  ANALYTICS_EVENTS: 'analytics.events',
} as const;

// Event types
export const USER_EVENT_TYPES = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  LOGIN: 'user.login',
  PASSWORD_CHANGED: 'user.password_changed',
  ACTIVATED: 'user.activated',
  DEACTIVATED: 'user.deactivated',
} as const;

export const POST_EVENT_TYPES = {
  CREATED: 'post.created',
  UPDATED: 'post.updated',
  DELETED: 'post.deleted',
  PUBLISHED: 'post.published',
  UNPUBLISHED: 'post.unpublished',
  LIKED: 'post.liked',
  UNLIKED: 'post.unliked',
} as const;

export const COMMENT_EVENT_TYPES = {
  CREATED: 'comment.created',
  UPDATED: 'comment.updated',
  DELETED: 'comment.deleted',
  APPROVED: 'comment.approved',
  REJECTED: 'comment.rejected',
} as const;

export const NOTIFICATION_EVENT_TYPES = {
  EMAIL_SENT: 'notification.email_sent',
  PUSH_SENT: 'notification.push_sent',
  SMS_SENT: 'notification.sms_sent',
  IN_APP_SENT: 'notification.in_app_sent',
} as const;

// Consumer group IDs
export const CONSUMER_GROUPS = {
  USER_SERVICE: 'user-service-consumers',
  POST_SERVICE: 'post-service-consumers',
  COMMENT_SERVICE: 'comment-service-consumers',
  NOTIFICATION_SERVICE: 'notification-service-consumers',
  ANALYTICS_SERVICE: 'analytics-service-consumers',
} as const;
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

@Entity('post_views')
@Index(['postId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['postId', 'userId', 'ipAddress']) // Prevent duplicate views
export class PostView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Post relationship
  @Column({ type: 'uuid' })
  @Index()
  postId: string;

  @ManyToOne('Post', 'views', {
    onDelete: 'CASCADE'
  })
  post: any;

  // User tracking (optional - for authenticated users)
  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  // Anonymous tracking
  @Column({ length: 45, nullable: true })
  @Index()
  ipAddress: string; // IPv4 or IPv6

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  // Referrer information
  @Column({ type: 'text', nullable: true })
  referrer: string;

  @Column({ length: 50, nullable: true })
  referrerDomain: string;

  // Device/Browser information
  @Column({ length: 50, nullable: true })
  deviceType: string; // mobile, tablet, desktop

  @Column({ length: 50, nullable: true })
  browserName: string;

  @Column({ length: 20, nullable: true })
  browserVersion: string;

  @Column({ length: 50, nullable: true })
  operatingSystem: string;

  // Geographic information (optional)
  @Column({ length: 10, nullable: true })
  country: string; // ISO country code

  @Column({ length: 100, nullable: true })
  city: string;

  // Session tracking
  @Column({ type: 'uuid', nullable: true })
  sessionId: string;

  @Column({ type: 'int', nullable: true })
  timeOnPage: number; // seconds spent on page

  // View metadata
  @Column({ type: 'boolean', default: false })
  isBot: boolean; // Detected bot traffic

  @Column({ type: 'boolean', default: true })
  isValid: boolean; // Valid view (not spam/bot)

  @Column({ type: 'simple-json', nullable: true })
  metadata: {
    source?: string; // social, search, direct, etc.
    campaign?: string; // UTM campaign
    medium?: string; // UTM medium
    content?: string; // UTM content
  };

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
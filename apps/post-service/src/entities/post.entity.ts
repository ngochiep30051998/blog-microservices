import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum ContentType {
  MARKDOWN = 'markdown',
  HTML = 'html',
  RICH_TEXT = 'rich_text',
}

@Entity('posts')
@Index(['status', 'publishedAt'])
@Index(['categoryId', 'status'])
@Index(['authorId', 'status'])
@Index(['featured', 'publishedAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  title: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ 
    type: 'enum', 
    enum: ContentType, 
    default: ContentType.MARKDOWN 
  })
  contentType: ContentType;

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @Column({ 
    type: 'enum', 
    enum: PostStatus, 
    default: PostStatus.DRAFT 
  })
  @Index()
  status: PostStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  featured: boolean;

  // Author information
  @Column({ type: 'uuid' })
  @Index()
  authorId: string;

  @Column({ length: 100 })
  authorName: string;

  // Category relationship
  @Column({ type: 'uuid', nullable: true })
  @Index()
  categoryId: string;

  @ManyToOne('Category', 'posts', {
    onDelete: 'SET NULL'
  })
  category: any;

  // Tags and keywords
  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'simple-array', nullable: true })
  keywords: string[];

  // Media URLs
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'text', nullable: true })
  featuredImageUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  galleryImages: {
    url: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  }[];

  // SEO fields
  @Column({ length: 60, nullable: true })
  metaTitle: string;

  @Column({ length: 160, nullable: true })
  metaDescription: string;

  @Column({ type: 'text', nullable: true })
  canonicalUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };

  @Column({ type: 'simple-json', nullable: true })
  twitterCard: {
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };

  // Content analysis
  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'int', default: 0 })
  readingTime: number; // in minutes

  @Column({ type: 'simple-json', nullable: true })
  headings: {
    level: number;
    text: string;
    id: string;
  }[];

  // Engagement metrics
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  // Publishing
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  // Versioning and editing
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'timestamp', nullable: true })
  lastEditedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  lastEditedBy: string;

  // Language and localization
  @Column({ length: 5, default: 'en' })
  @Index()
  language: string;

  // Ordering and priority
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Post views relationship
  @OneToMany('PostView', 'post', {
    cascade: true
  })
  views: any[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.title && !this.slug) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-');
    }
  }

  @BeforeInsert()
  setPublishedAt() {
    if (this.status === PostStatus.PUBLISHED && !this.publishedAt) {
      this.publishedAt = new Date();
    }
  }

  @BeforeUpdate()
  updateLastEdited() {
    this.lastEditedAt = new Date();
  }
}
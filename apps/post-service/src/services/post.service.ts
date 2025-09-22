import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, Not, IsNull } from 'typeorm';
// import { ClientProxy } from '@nestjs/microservices';
import { Post, PostStatus, ContentType } from '../entities/post.entity';
import { Category } from '../entities/category.entity';
import { PostView } from '../entities/post-view.entity';
import { ContentAnalyzerService, ContentAnalysis } from './content-analyzer.service';
import { CategoryService } from './category.service';

export interface CreatePostData {
  title: string;
  description: string;
  content: string;
  contentType?: ContentType;
  excerpt?: string;
  status?: PostStatus;
  categoryId?: string;
  tags?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
  featuredImageUrl?: string;
  galleryImages?: Array<{
    url: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  }>;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  twitterCard?: {
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  featured?: boolean;
  scheduledAt?: Date;
  language?: string;
  sortOrder?: number;
}

export interface UpdatePostData {
  title?: string;
  description?: string;
  content?: string;
  contentType?: ContentType;
  excerpt?: string;
  status?: PostStatus;
  categoryId?: string;
  tags?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
  featuredImageUrl?: string;
  galleryImages?: Array<{
    url: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  }>;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  twitterCard?: {
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  featured?: boolean;
  scheduledAt?: Date;
  language?: string;
  sortOrder?: number;
}

export interface PostFilters {
  status?: PostStatus;
  categoryId?: string;
  authorId?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  language?: string;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(PostView)
    private postViewRepository: Repository<PostView>,
    private contentAnalyzer: ContentAnalyzerService,
    private categoryService: CategoryService,
    // @Inject('KAFKA_CLIENT')
    // private kafkaClient: ClientProxy,
  ) {}

  /**
   * Create a new post
   */
  async create(data: CreatePostData, authorId: string, authorName: string): Promise<Post> {
    // Validate category if provided
    if (data.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId, isActive: true }
      });
      if (!category) {
        throw new BadRequestException('Category not found or inactive');
      }
    }

    // Generate slug from title
    const slug = await this.generateUniqueSlug(data.title);

    // Analyze content
    const analysis = this.contentAnalyzer.analyzeContent(
      data.content, 
      data.contentType || ContentType.MARKDOWN
    );

    // Generate excerpt if not provided
    const excerpt = data.excerpt || this.contentAnalyzer.generateExcerpt(
      data.content,
      data.contentType || ContentType.MARKDOWN
    );

    // Optimize SEO if needed
    const seoOptimization = this.contentAnalyzer.optimizeSEO(
      data.title,
      data.description,
      data.content
    );

    // Auto-generate keywords if not provided
    const keywords = data.keywords?.length ? data.keywords : 
      this.contentAnalyzer.extractKeywords(data.content, data.title);

    // Create post
    const post = this.postRepository.create({
      title: data.title,
      slug,
      description: data.description,
      content: data.content,
      contentType: data.contentType || ContentType.MARKDOWN,
      excerpt,
      status: data.status || PostStatus.DRAFT,
      featured: data.featured || false,
      authorId,
      authorName,
      categoryId: data.categoryId,
      tags: data.tags || [],
      keywords,
      thumbnailUrl: data.thumbnailUrl,
      featuredImageUrl: data.featuredImageUrl,
      galleryImages: data.galleryImages || [],
      metaTitle: data.metaTitle || seoOptimization.metaTitle,
      metaDescription: data.metaDescription || seoOptimization.metaDescription,
      canonicalUrl: data.canonicalUrl,
      openGraph: data.openGraph,
      twitterCard: data.twitterCard,
      wordCount: analysis.wordCount,
      readingTime: analysis.readingTime,
      headings: analysis.headings,
      scheduledAt: data.scheduledAt,
      language: data.language || 'en',
      sortOrder: data.sortOrder || 0,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      version: 1,
    });

    const savedPost = await this.postRepository.save(post);

    // Update category post count
    if (data.categoryId && savedPost.status === PostStatus.PUBLISHED) {
      await this.categoryService.updatePostCount(data.categoryId, 1);
    }

    // Publish event
    this.publishEvent('post.created', {
      postId: savedPost.id,
      authorId,
      status: savedPost.status,
      categoryId: savedPost.categoryId,
      tags: savedPost.tags,
    });

    return await this.findOne(savedPost.id);
  }

  /**
   * Find posts with filters and pagination
   */
  async findAll(
    pagination: { page?: number; limit?: number }, 
    filters: PostFilters = {}
  ): Promise<PaginationResult<any>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(50, Math.max(1, pagination.limit || 10));
    const offset = (page - 1) * limit;

    let query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .select([
        'post.id',
        'post.title', 
        'post.slug',
        'post.description',
        'post.excerpt',
        'post.status',
        'post.featured',
        'post.authorId',
        'post.authorName',
        'post.categoryId',
        'post.tags',
        'post.thumbnailUrl',
        'post.wordCount',
        'post.readingTime',
        'post.viewCount',
        'post.likeCount',
        'post.commentCount',
        'post.publishedAt',
        'post.createdAt',
        'post.updatedAt',
        'category.id',
        'category.name',
        'category.slug',
        'category.color',
      ]);

    // Apply filters
    query = this.applyFilters(query, filters);

    // Default ordering: featured first, then by publication date
    query.orderBy('post.featured', 'DESC')
         .addOrderBy('post.publishedAt', 'DESC')
         .addOrderBy('post.createdAt', 'DESC');

    // Get total count
    const total = await query.getCount();
    
    // Apply pagination
    const items = await query
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find post by ID
   */
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  /**
   * Find post by slug (for public access)
   */
  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { 
        slug,
        status: PostStatus.PUBLISHED,
        publishedAt: Not(IsNull()),
      },
      relations: ['category'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if post is scheduled for future
    if (post.scheduledAt && post.scheduledAt > new Date()) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  /**
   * Update post
   */
  async update(
    id: string, 
    data: UpdatePostData, 
    userId: string, 
    userRole: string
  ): Promise<Post> {
    const post = await this.findOne(id);

    // Permission check
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // Validate category if changed
    if (data.categoryId && data.categoryId !== post.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId, isActive: true }
      });
      if (!category) {
        throw new BadRequestException('Category not found or inactive');
      }
    }

    // Re-analyze content if content changed
    let analysis: ContentAnalysis | null = null;
    if (data.content && data.content !== post.content) {
      analysis = this.contentAnalyzer.analyzeContent(
        data.content,
        data.contentType || post.contentType
      );
    }

    // Generate new slug if title changed
    let newSlug = post.slug;
    if (data.title && data.title !== post.title) {
      newSlug = await this.generateUniqueSlug(data.title, id);
    }

    // Update fields
    const oldCategoryId = post.categoryId;
    const oldStatus = post.status;

    Object.assign(post, {
      title: data.title || post.title,
      slug: newSlug,
      description: data.description !== undefined ? data.description : post.description,
      content: data.content || post.content,
      contentType: data.contentType || post.contentType,
      excerpt: data.excerpt !== undefined ? data.excerpt : post.excerpt,
      status: data.status !== undefined ? data.status : post.status,
      featured: data.featured !== undefined ? data.featured : post.featured,
      categoryId: data.categoryId !== undefined ? data.categoryId : post.categoryId,
      tags: data.tags || post.tags,
      keywords: data.keywords || post.keywords,
      thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : post.thumbnailUrl,
      featuredImageUrl: data.featuredImageUrl !== undefined ? data.featuredImageUrl : post.featuredImageUrl,
      galleryImages: data.galleryImages || post.galleryImages,
      metaTitle: data.metaTitle !== undefined ? data.metaTitle : post.metaTitle,
      metaDescription: data.metaDescription !== undefined ? data.metaDescription : post.metaDescription,
      canonicalUrl: data.canonicalUrl !== undefined ? data.canonicalUrl : post.canonicalUrl,
      openGraph: data.openGraph || post.openGraph,
      twitterCard: data.twitterCard || post.twitterCard,
      scheduledAt: data.scheduledAt !== undefined ? data.scheduledAt : post.scheduledAt,
      language: data.language || post.language,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : post.sortOrder,
      lastEditedBy: userId,
      version: post.version + 1,
    });

    // Update content analysis if content changed
    if (analysis) {
      post.wordCount = analysis.wordCount;
      post.readingTime = analysis.readingTime;
      post.headings = analysis.headings;
    }

    const savedPost = await this.postRepository.save(post);

    // Update category counts if needed
    if (oldCategoryId !== post.categoryId) {
      if (oldCategoryId && oldStatus === PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(oldCategoryId, -1);
      }
      if (post.categoryId && post.status === PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(post.categoryId, 1);
      }
    } else if (oldStatus !== post.status && post.categoryId) {
      if (oldStatus === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(post.categoryId, -1);
      } else if (oldStatus !== PostStatus.PUBLISHED && post.status === PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(post.categoryId, 1);
      }
    }

    // Publish event
    this.publishEvent('post.updated', {
      postId: savedPost.id,
      authorId: post.authorId,
      updatedBy: userId,
      changes: data,
    });

    return await this.findOne(savedPost.id);
  }

  /**
   * Toggle publish status
   */
  async togglePublish(id: string, userId: string, userRole: string): Promise<Post> {
    const post = await this.findOne(id);

    // Permission check
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only publish/unpublish your own posts');
    }

    const newStatus = post.status === PostStatus.PUBLISHED 
      ? PostStatus.DRAFT 
      : PostStatus.PUBLISHED;

    const oldStatus = post.status;
    post.status = newStatus;
    post.lastEditedBy = userId;

    if (newStatus === PostStatus.PUBLISHED && !post.publishedAt) {
      post.publishedAt = new Date();
    }

    const savedPost = await this.postRepository.save(post);

    // Update category count
    if (post.categoryId) {
      if (oldStatus === PostStatus.PUBLISHED && newStatus !== PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(post.categoryId, -1);
      } else if (oldStatus !== PostStatus.PUBLISHED && newStatus === PostStatus.PUBLISHED) {
        await this.categoryService.updatePostCount(post.categoryId, 1);
      }
    }

    // Publish event
    this.publishEvent('post.status_changed', {
      postId: savedPost.id,
      authorId: post.authorId,
      oldStatus,
      newStatus,
      publishedBy: userId,
    });

    return await this.findOne(savedPost.id);
  }

  /**
   * Soft delete post
   */
  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const post = await this.findOne(id);

    // Permission check
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Update category count if published
    if (post.categoryId && post.status === PostStatus.PUBLISHED) {
      await this.categoryService.updatePostCount(post.categoryId, -1);
    }

    await this.postRepository.softDelete(id);

    // Publish event
    this.publishEvent('post.deleted', {
      postId: id,
      authorId: post.authorId,
      deletedBy: userId,
    });
  }

  /**
   * Record post view for analytics
   */
  async recordView(
    postId: string, 
    userId?: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    // Check if view already exists (prevent duplicate views)
    const existingView = await this.postViewRepository.findOne({
      where: {
        postId,
        ...(userId ? { userId } : { ipAddress }),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
      }
    });

    if (!existingView) {
      // Create new view record
      const view = this.postViewRepository.create({
        postId,
        userId,
        ipAddress,
        userAgent,
        isValid: true,
      });

      await this.postViewRepository.save(view);

      // Increment post view count
      await this.postRepository.increment({ id: postId }, 'viewCount', 1);

      // Update category views if post has category
      const post = await this.postRepository.findOne({
        where: { id: postId },
        select: ['categoryId'],
      });

      if (post?.categoryId) {
        await this.categoryService.updateTotalViews(post.categoryId, 1);
      }
    }
  }

  /**
   * Get popular posts
   */
  async getPopularPosts(limit: number = 5): Promise<any[]> {
    return await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .select([
        'post.id',
        'post.title',
        'post.slug',
        'post.description',
        'post.excerpt',
        'post.authorName',
        'post.thumbnailUrl',
        'post.viewCount',
        'post.likeCount',
        'post.readingTime',
        'post.publishedAt',
        'category.id',
        'category.name',
        'category.slug',
        'category.color',
      ])
      .orderBy('post.viewCount', 'DESC')
      .addOrderBy('post.likeCount', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get related posts based on category and tags
   */
  async getRelatedPosts(postId: string, limit: number = 5): Promise<any[]> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      select: ['categoryId', 'tags'],
    });

    if (!post) return [];

    let query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.id != :postId', { postId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED })
      .select([
        'post.id',
        'post.title',
        'post.slug',
        'post.description',
        'post.excerpt',
        'post.authorName',
        'post.thumbnailUrl',
        'post.readingTime',
        'post.publishedAt',
        'category.id',
        'category.name',
        'category.slug',
        'category.color',
      ]);

    // Prioritize posts in same category
    if (post.categoryId) {
      query = query.andWhere('post.categoryId = :categoryId', { categoryId: post.categoryId });
    }

    // Add tag-based similarity (if no category matches found, we'll fall back to this)
    const results = await query
      .orderBy('post.publishedAt', 'DESC')
      .limit(limit)
      .getMany();

    // If not enough results, try with tags
    if (results.length < limit && post.tags?.length) {
      const tagQuery = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.category', 'category')
        .where('post.id != :postId', { postId })
        .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

      // Add tag conditions
      const tagConditions = post.tags.map((_, index) => 
        `post.tags::text LIKE :tag${index}`
      ).join(' OR ');

      if (tagConditions) {
        tagQuery.andWhere(`(${tagConditions})`);
        
        // Add parameters for tags
        const parameters: any = {};
        post.tags.forEach((tag, index) => {
          parameters[`tag${index}`] = `%${tag}%`;
        });
        tagQuery.setParameters(parameters);
      }

      const tagResults = await tagQuery
        .select([
          'post.id',
          'post.title',
          'post.slug', 
          'post.description',
          'post.excerpt',
          'post.authorName',
          'post.thumbnailUrl',
          'post.readingTime',
          'post.publishedAt',
          'category.id',
          'category.name',
          'category.slug', 
          'category.color',
        ])
        .orderBy('post.publishedAt', 'DESC')
        .limit(limit - results.length)
        .getMany();

      // Merge and deduplicate results
      const existingIds = new Set(results.map(r => r.id));
      const additionalResults = tagResults.filter(r => !existingIds.has(r.id));
      results.push(...additionalResults);
    }

    return results.slice(0, limit);
  }

  /**
   * Get post statistics
   */
  async getPostStats(authorId?: string): Promise<any> {
    const baseWhere = authorId ? { authorId } : {};

    const totalPosts = await this.postRepository.count({ where: baseWhere });
    const publishedPosts = await this.postRepository.count({ 
      where: { ...baseWhere, status: PostStatus.PUBLISHED }
    });
    const draftPosts = await this.postRepository.count({ 
      where: { ...baseWhere, status: PostStatus.DRAFT }
    });
    const featuredPosts = await this.postRepository.count({ 
      where: { ...baseWhere, featured: true }
    });

    // View statistics
    const viewStats = await this.postRepository.query(`
      SELECT 
        COALESCE(SUM(view_count), 0) as total_views,
        COALESCE(AVG(view_count), 0) as avg_views
      FROM posts 
      WHERE ${authorId ? 'author_id = $1 AND' : ''} deleted_at IS NULL
    `, authorId ? [authorId] : []);

    // Engagement statistics
    const engagementStats = await this.postRepository.query(`
      SELECT 
        COALESCE(SUM(like_count), 0) as total_likes,
        COALESCE(SUM(comment_count), 0) as total_comments,
        COALESCE(SUM(share_count), 0) as total_shares,
        COALESCE(AVG(reading_time), 0) as avg_reading_time
      FROM posts 
      WHERE ${authorId ? 'author_id = $1 AND' : ''} deleted_at IS NULL
    `, authorId ? [authorId] : []);

    return {
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
        featured: featuredPosts,
      },
      views: {
        total: parseInt(viewStats[0]?.total_views || 0),
        average: parseFloat(viewStats[0]?.avg_views || 0),
      },
      engagement: {
        totalLikes: parseInt(engagementStats[0]?.total_likes || 0),
        totalComments: parseInt(engagementStats[0]?.total_comments || 0),
        totalShares: parseInt(engagementStats[0]?.total_shares || 0),
        averageReadingTime: parseFloat(engagementStats[0]?.avg_reading_time || 0),
      },
    };
  }

  /**
   * Apply filters to query
   */
  private applyFilters(
    query: SelectQueryBuilder<Post>, 
    filters: PostFilters
  ): SelectQueryBuilder<Post> {
    // Status filter (default to published for public access)
    if (filters.status) {
      query.andWhere('post.status = :status', { status: filters.status });
    } else {
      query.andWhere('post.status = :status', { status: PostStatus.PUBLISHED });
    }

    // Category filter
    if (filters.categoryId) {
      query.andWhere('post.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    // Author filter
    if (filters.authorId) {
      query.andWhere('post.authorId = :authorId', { authorId: filters.authorId });
    }

    // Tag filter
    if (filters.tag) {
      query.andWhere('post.tags::text LIKE :tag', { tag: `%${filters.tag}%` });
    }

    // Search filter (title and content)
    if (filters.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.description ILIKE :search OR post.content ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Featured filter
    if (filters.featured !== undefined) {
      query.andWhere('post.featured = :featured', { featured: filters.featured });
    }

    // Language filter
    if (filters.language) {
      query.andWhere('post.language = :language', { language: filters.language });
    }

    return query;
  }

  /**
   * Generate unique slug
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.postRepository.findOne({
        where: { 
          slug,
          ...(excludeId ? { id: Not(excludeId) } : {})
        }
      });

      if (!existing) break;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Publish Kafka event
   */
  private publishEvent(eventType: string, data: any): void {
    // TODO: Re-enable when Kafka is configured
    console.log(`📤 Event: ${eventType}`, data);
    // this.kafkaClient.emit(eventType, {
    //   ...data,
    //   timestamp: new Date().toISOString(),
    //   service: 'post-service',
    // }).subscribe({
    //   error: (err) => console.warn('Failed to publish event:', err),
    // });
  }
}
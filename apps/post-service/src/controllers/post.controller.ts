import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard } from '@blog/shared/auth';
import {
  CreatePostDto,
  UpdatePostDto,
  PostResponseDto,
  PostListItemDto,
  PaginationDto,
  SuccessResponseDto,
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
} from '@blog/shared/dto';

// Local imports
import { PostService } from '../services/post.service';
import { PostStatus } from '../entities/post.entity';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new post',
    description: `
Create a new blog post with rich content and media.

**Features:**
- Rich text content with markdown/HTML support
- SEO optimization with meta tags
- Category and tag organization
- Draft/Published workflow
- Automatic content analysis (reading time, word count)
- Social media metadata
- Scheduling support

**Note:** File uploads (images, thumbnails, gallery) are now handled by the Upload Service.
Use the Upload Service endpoints first, then reference the file URLs in your post content.

**Content Types:**
- \`markdown\` - Markdown formatted content
- \`html\` - Raw HTML content  
- \`rich_text\` - Rich text editor content

**Post Status:**
- \`draft\` - Private draft, not visible publicly
- \`published\` - Published and visible to all
- \`scheduled\` - Scheduled for future publication
    `
  })
  @ApiCreatedResponse(PostResponseDto, 'Post created successfully')
  async create(
    @Body() createPostDto: CreatePostDto,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.create(
      createPostDto,
      req.user.id,
      req.user.username || `${req.user.firstName} ${req.user.lastName}`.trim()
    );
    
    return ResponseBuilder.created(post, 'Post created successfully', {
      isDraft: post.status === PostStatus.DRAFT,
      isPublished: post.status === PostStatus.PUBLISHED,
      autoAnalyzed: true,
      uploadServiceNote: 'Use Upload Service for file uploads',
    });
  }

  @Get('list')
  @ApiOperation({ 
    summary: 'Get all posts with filtering and pagination',
    description: `
Retrieve paginated list of posts with advanced filtering options.

**Default Behavior:**
- Returns only published posts
- Ordered by featured first, then publication date
- Excludes soft-deleted posts

**Filtering Options:**
- \`status\` - Filter by post status (draft, published, etc.)
- \`categoryId\` - Filter by category
- \`authorId\` - Filter by author
- \`tag\` - Filter by specific tag
- \`search\` - Full-text search in title and content
- \`featured\` - Show only featured posts
- \`language\` - Filter by language code

**Use Cases:**
- Public blog listing (no filters)
- Admin dashboard (with status filters)
- Author portfolio (with authorId filter)
- Category pages (with categoryId filter)
    `
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: PostStatus })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'authorId', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiPaginatedResponse(PostListItemDto, 'Posts retrieved successfully')
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: PostStatus,
    @Query('categoryId') categoryId?: string,
    @Query('authorId') authorId?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: boolean,
  ): Promise<SuccessResponseDto<any>> {
    const filters = {
      status,
      categoryId,
      authorId,
      tag,
      search,
      featured,
    };

    const result = await this.postService.findAll(paginationDto, filters);
    
    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      'Posts retrieved successfully'
    );
  }

  @Get('popular')
  @ApiOperation({ 
    summary: 'Get popular posts',
    description: 'Retrieve most popular posts based on views and engagement'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiSuccessResponse(PostListItemDto, 'Popular posts retrieved successfully', 200)
  async getPopular(
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    const posts = await this.postService.getPopularPosts(limit || 5);
    
    return ResponseBuilder.success(
      posts, 
      'Popular posts retrieved successfully',
      HttpStatus.OK,
      { algorithm: 'views_and_likes' }
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get post statistics',
    description: 'Get comprehensive post and engagement statistics'
  })
  @ApiSuccessResponse(Object, 'Statistics retrieved successfully')
  async getStats(
    @Request() req
  ): Promise<SuccessResponseDto<any>> {
    const isAdmin = req.user.role === 'admin';
    const authorId = isAdmin ? undefined : req.user.id;
    
    const stats = await this.postService.getPostStats(authorId);
    
    return ResponseBuilder.success(
      stats,
      'Statistics retrieved successfully',
      HttpStatus.OK,
      { 
        scope: isAdmin ? 'global' : 'user',
        authorId: authorId || 'all'
      }
    );
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Full-text search posts',
    description: 'Search posts using full-text search across title, content, and tags'
  })
  @ApiQuery({ name: 'q', description: 'Search query', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiPaginatedResponse(PostListItemDto, 'Search results retrieved successfully')
  async search(
    @Query('q') query: string,
    @Query() paginationDto: PaginationDto
  ): Promise<SuccessResponseDto<any>> {
    const filters = { search: query };
    const result = await this.postService.findAll(paginationDto, filters);
    
    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      `Found ${result.total} posts matching "${query}"`
    );
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user posts',
    description: 'Retrieve posts created by the authenticated user'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PostStatus })
  @ApiPaginatedResponse(PostListItemDto, 'User posts retrieved successfully')
  async getMyPosts(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: PostStatus,
    @Request() req?: any
  ): Promise<SuccessResponseDto<any>> {
    const filters = {
      authorId: req.user.id,
      status,
    };

    const result = await this.postService.findAll(paginationDto, filters);
    
    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      'Your posts retrieved successfully'
    );
  }

    @Get(':id')
  @ApiOperation({ 
    summary: 'Get post by ID',
    description: 'Retrieve a single post by ID with all details and related data'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved successfully')
  async findOne(
    @Param('id') id: string
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.findOne(id);
    
    return ResponseBuilder.success(post, 'Post retrieved successfully', HttpStatus.OK, {
      views: post.viewCount,
      likes: post.likeCount,
      comments: post.commentCount,
    });
  }

  @Get(':slug/by-slug')
  @ApiOperation({ 
    summary: 'Get post by slug',
    description: 'Retrieve a single post by its SEO-friendly slug'
  })
  @ApiParam({ name: 'slug', description: 'Post slug' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved successfully')
  async findBySlug(
    @Param('slug') slug: string
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.findBySlug(slug);
    
    return ResponseBuilder.success(post, 'Post retrieved successfully', HttpStatus.OK, {
      accessMethod: 'slug',
      views: post.viewCount,
    });
  }

  @Get(':id/related')
  @ApiOperation({ 
    summary: 'Get related posts',
    description: 'Get posts related to the specified post based on category and tags'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Post UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiSuccessResponse(PostListItemDto, 'Related posts retrieved successfully', 200)
  async getRelated(
    @Param('id') id: string,
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    const relatedPosts = await this.postService.getRelatedPosts(id, limit || 5);
    
    return ResponseBuilder.success(
      relatedPosts,
      'Related posts retrieved successfully',
      HttpStatus.OK,
      { algorithm: 'category_and_tags' }
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update post',
    description: 'Update an existing post. Only the author or admin can update.'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiUpdatedResponse(PostResponseDto, 'Post updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.update(id, updatePostDto, req.user.id, req.user.role);
    
    return ResponseBuilder.updated(post, 'Post updated successfully', {
      updatedBy: req.user.id,
      version: post.version,
      lastEditedAt: post.lastEditedAt,
    });
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Publish draft post',
    description: 'Change post status from draft to published'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiSuccessResponse(PostResponseDto, 'Post published successfully')
  async publish(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.togglePublish(id, req.user.id, req.user.role);
    
    if (post.status !== PostStatus.PUBLISHED) {
      // If not published after toggle, call toggle again
      const publishedPost = await this.postService.togglePublish(id, req.user.id, req.user.role);
      return ResponseBuilder.success(publishedPost, 'Post published successfully', HttpStatus.OK, {
        publishedBy: req.user.id,
        publishedAt: publishedPost.publishedAt,
        wasScheduled: !!publishedPost.scheduledAt,
      });
    }
    
    return ResponseBuilder.success(post, 'Post published successfully', HttpStatus.OK, {
      publishedBy: req.user.id,
      publishedAt: post.publishedAt,
      wasScheduled: !!post.scheduledAt,
    });
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Unpublish post',
    description: 'Change post status from published back to draft'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiSuccessResponse(PostResponseDto, 'Post unpublished successfully')
  async unpublish(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    // Use togglePublish to unpublish (change from published to draft)
    const post = await this.postService.togglePublish(id, req.user.id, req.user.role);
    
    return ResponseBuilder.success(post, 'Post unpublished successfully', HttpStatus.OK, {
      unpublishedBy: req.user.id,
      previousStatus: PostStatus.PUBLISHED,
    });
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Like/unlike post',
    description: 'Toggle like status for a post'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiSuccessResponse(Object, 'Post like status updated')
  async toggleLike(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<{ liked: boolean; likeCount: number }>> {
    // For now, return a placeholder since we don't have like functionality yet
    // This would need to be implemented in PostService and database
    const post = await this.postService.findOne(id);
    
    const result = {
      liked: false, // Placeholder - would need user-specific like tracking
      likeCount: post.likeCount
    };
    
    return ResponseBuilder.success(
      result,
      'Like functionality not yet implemented',
      HttpStatus.OK,
      { 
        userId: req.user.id,
        note: 'This endpoint will be implemented with user-specific like tracking'
      }
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete post',
    description: 'Soft delete a post. Only the author or admin can delete.'
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiDeletedResponse('Post deleted successfully')
  async remove(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.remove(id, req.user.id, req.user.role);
    
    return ResponseBuilder.deleted('Post deleted successfully', {
      deletedBy: req.user.id,
      type: 'soft_delete',
      note: 'Associated uploaded files are managed by Upload Service',
    });
  }
}
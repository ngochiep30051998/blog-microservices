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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

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
  ApiSuccessMessageResponse,
} from '@blog/shared/dto';

// Local imports
import { PostService } from '../services/post.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { PostStatus } from '../entities/post.entity';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
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
    });
  }

  @Get()
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
  @ApiQuery({ name: 'language', required: false, type: String, example: 'en' })
  @ApiPaginatedResponse(PostListItemDto, 'Posts retrieved successfully')
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: PostStatus,
    @Query('categoryId') categoryId?: string,
    @Query('authorId') authorId?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: boolean,
    @Query('language') language?: string
  ): Promise<SuccessResponseDto<any>> {
    const filters = {
      status,
      categoryId,
      authorId,
      tag,
      search,
      featured,
      language,
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
  async getStats(@Request() req): Promise<SuccessResponseDto<any>> {
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
    description: 'Retrieve a specific post by its ID with full details'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Post UUID' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved successfully')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.findOne(id);
    
    return ResponseBuilder.success(post, 'Post retrieved successfully');
  }

  @Get('slug/:slug')
  @ApiOperation({ 
    summary: 'Get post by slug',
    description: `
Get a published post by its slug for public viewing.

**Features:**
- Only returns published posts
- Checks publication date for scheduled posts
- Records post view for analytics
- Returns 404 for private/draft posts

**Use Case:**
- Public blog post display
- SEO-friendly URLs
- Social media sharing
    `
  })
  @ApiParam({ name: 'slug', type: 'string', description: 'Post slug' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved successfully')
  async findBySlug(
    @Param('slug') slug: string,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.findBySlug(slug);
    
    // Record view (async, don't wait)
    this.postService.recordView(
      post.id,
      req.user?.id,
      req.ip,
      req.headers['user-agent']
    ).catch(() => {}); // Ignore view recording errors
    
    return ResponseBuilder.success(post, 'Post retrieved successfully', HttpStatus.OK, {
      viewRecorded: true,
      publicAccess: true,
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
    description: `
Update a post. Users can only update their own posts unless they're admin.

**Features:**
- Automatic content re-analysis if content changed
- Slug uniqueness validation
- Category validation
- Publication status management
- Audit trail (lastEditedAt, lastEditedBy)

**Permissions:**
- Authors can edit their own posts
- Admins can edit any post
    `
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Post UUID' })
  @ApiUpdatedResponse(PostResponseDto, 'Post updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.update(
      id,
      updatePostDto,
      req.user.id,
      req.user.role
    );
    
    return ResponseBuilder.updated(post, 'Post updated successfully', {
      contentReanalyzed: !!updatePostDto.content,
      lastEditedBy: req.user.id,
    });
  }

  @Patch(':id/toggle-publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Toggle post publish status',
    description: 'Publish or unpublish a post. Sets publication date automatically.'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Post UUID' })
  @ApiUpdatedResponse(PostResponseDto, 'Post publication status updated')
  async togglePublish(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    const post = await this.postService.togglePublish(id, req.user.id, req.user.role);
    
    const message = post.status === PostStatus.PUBLISHED 
      ? 'Post published successfully' 
      : 'Post unpublished successfully';
    
    return ResponseBuilder.updated(post, message, {
      newStatus: post.status,
      publishedAt: post.publishedAt,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete post',
    description: 'Soft delete a post. Users can only delete their own posts unless they are admin.'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Post UUID' })
  @ApiDeletedResponse('Post deleted successfully')
  async remove(
    @Param('id') id: string,
    @Request() req
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.remove(id, req.user.id, req.user.role);
    
    return ResponseBuilder.deleted('Post deleted successfully', {
      deletedBy: req.user.id,
      type: 'soft_delete',
    });
  }

  // Image Upload Endpoints

  @Post('upload/thumbnail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload post thumbnail',
    description: `
Upload and optimize a thumbnail image for a post.

**Optimizations Applied:**
- Resized to 800x450 pixels
- WebP format for better compression
- Auto quality optimization
- CDN delivery via Cloudinary

**File Requirements:**
- Max file size: 5MB
- Supported formats: JPEG, PNG, WebP
- Recommended dimensions: 16:9 aspect ratio
    `
  })
  @ApiSuccessResponse(Object, 'Thumbnail uploaded successfully')
  async uploadThumbnail(
    @UploadedFile() file: any
  ): Promise<SuccessResponseDto<any>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.cloudinaryService.uploadThumbnail(file);
    
    return ResponseBuilder.success({
      url: result.secureUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    }, 'Thumbnail uploaded successfully', HttpStatus.CREATED);
  }

  @Post('upload/featured')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload featured image',
    description: 'Upload and optimize a featured image for a post (1200x630 for social sharing)'
  })
  @ApiSuccessResponse(Object, 'Featured image uploaded successfully')
  async uploadFeaturedImage(
    @UploadedFile() file: any
  ): Promise<SuccessResponseDto<any>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.cloudinaryService.uploadFeaturedImage(file);
    
    return ResponseBuilder.success({
      url: result.secureUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    }, 'Featured image uploaded successfully', HttpStatus.CREATED);
  }

  @Post('upload/content')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload content image',
    description: 'Upload image for use within post content (rich text editor)'
  })
  @ApiSuccessResponse(Object, 'Content image uploaded successfully')
  async uploadContentImage(
    @UploadedFile() file: any
  ): Promise<SuccessResponseDto<any>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.cloudinaryService.uploadContentImage(file);
    
    return ResponseBuilder.success({
      url: result.secureUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      responsive: this.cloudinaryService.generateResponsiveUrls(result.publicId),
    }, 'Content image uploaded successfully', HttpStatus.CREATED);
  }

  @Post('upload/gallery')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload gallery images',
    description: 'Upload multiple images for post gallery (max 10 files)'
  })
  @ApiSuccessResponse(Object, 'Gallery images uploaded successfully')
  async uploadGalleryImages(
    @UploadedFiles() files: any[]
  ): Promise<SuccessResponseDto<any[]>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = await Promise.all(
      files.map(file => this.cloudinaryService.uploadGalleryImage(file))
    );
    
    const galleryData = results.map(result => ({
      url: result.secureUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      alt: '', // To be filled by user
      caption: '', // To be filled by user
    }));
    
    return ResponseBuilder.success(
      galleryData,
      `${files.length} gallery images uploaded successfully`,
      HttpStatus.CREATED
    );
  }
}
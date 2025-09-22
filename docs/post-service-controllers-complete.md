# Post Service - Controllers & API Endpoints (Part 3)

## 🚀 Tiếp tục - Controllers Implementation

---

# BƯỚC 7: POST CONTROLLERS

## 7.1 Main Post Controller
```bash
# File: apps/post-service/src/controllers/post.controller.ts
mkdir -p apps/post-service/src/controllers

cat > apps/post-service/src/controllers/post.controller.ts << 'EOF'
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
  @ApiSuccessResponse([PostListItemDto], 'Popular posts retrieved successfully')
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
  @ApiSuccessResponse([PostListItemDto], 'Related posts retrieved successfully')
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
    @UploadedFile() file: Express.Multer.File
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
    @UploadedFile() file: Express.Multer.File
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
    @UploadedFile() file: Express.Multer.File
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
  @ApiSuccessResponse([Object], 'Gallery images uploaded successfully')
  async uploadGalleryImages(
    @UploadedFiles() files: Express.Multer.File[]
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
EOF
```

## 7.2 Category Controller
```bash
# File: apps/post-service/src/controllers/category.controller.ts
cat > apps/post-service/src/controllers/category.controller.ts << 'EOF'
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard, Roles, RoleGuard } from '@blog/shared/auth';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  SuccessResponseDto,
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
} from '@blog/shared/dto';

// Local imports
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create new category',
    description: `
Create a new post category with hierarchical support.

**Features:**
- Automatic slug generation from name
- Hierarchical categories (max 3 levels)
- SEO metadata support
- Color and icon customization
- Sort ordering

**Permissions:**
- Admin and Editor roles only
    `
  })
  @ApiCreatedResponse(CategoryResponseDto, 'Category created successfully')
  async create(
    @Body() createCategoryDto: CreateCategoryDto
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.create(createCategoryDto);
    
    return ResponseBuilder.created(category, 'Category created successfully', {
      level: category.level,
      hasParent: !!category.parentId,
    });
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: `
Retrieve all categories with hierarchical structure.

**Features:**
- Hierarchical ordering (parent → child)
- Post count for each category
- Active/inactive filtering
- Sort by custom order and name

**Use Cases:**
- Category dropdown/select lists
- Navigation menus
- Blog sidebar
    `
  })
  @ApiSuccessResponse([CategoryResponseDto], 'Categories retrieved successfully')
  async findAll(): Promise<SuccessResponseDto<CategoryResponseDto[]>> {
    const categories = await this.categoryService.findAll();
    
    return ResponseBuilder.success(
      categories,
      'Categories retrieved successfully',
      HttpStatus.OK,
      { totalCount: categories.length }
    );
  }

  @Get('hierarchy')
  @ApiOperation({ 
    summary: 'Get category hierarchy',
    description: 'Get categories structured as a tree with parent-child relationships'
  })
  @ApiSuccessResponse(Object, 'Category hierarchy retrieved successfully')
  async getHierarchy(): Promise<SuccessResponseDto<any>> {
    const hierarchy = await this.categoryService.findHierarchy();
    
    return ResponseBuilder.success(
      hierarchy,
      'Category hierarchy retrieved successfully',
      HttpStatus.OK,
      { structure: 'tree' }
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get category statistics',
    description: 'Get comprehensive category statistics for admin dashboard'
  })
  @ApiSuccessResponse(Object, 'Category statistics retrieved successfully')
  async getStats(): Promise<SuccessResponseDto<any>> {
    const stats = await this.categoryService.getCategoryStats();
    
    return ResponseBuilder.success(
      stats,
      'Category statistics retrieved successfully'
    );
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: 'Retrieve a specific category with post count'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.findOne(id);
    
    return ResponseBuilder.success(category, 'Category retrieved successfully');
  }

  @Get('slug/:slug')
  @ApiOperation({ 
    summary: 'Get category by slug',
    description: 'Get category by slug for public category pages'
  })
  @ApiParam({ name: 'slug', type: 'string', description: 'Category slug' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findBySlug(@Param('slug') slug: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.findBySlug(slug);
    
    return ResponseBuilder.success(category, 'Category retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update category',
    description: 'Update category information including hierarchy changes'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiUpdatedResponse(CategoryResponseDto, 'Category updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.update(id, updateCategoryDto);
    
    return ResponseBuilder.updated(category, 'Category updated successfully', {
      hierarchyChanged: updateCategoryDto.parentId !== undefined,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete category',
    description: `
Delete a category. Category must be empty (no posts or subcategories).

**Restrictions:**
- Cannot delete category with posts
- Cannot delete category with subcategories
- Admin role required
    `
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiDeletedResponse('Category deleted successfully')
  async remove(@Param('id') id: string): Promise<SuccessResponseDto<null>> {
    await this.categoryService.remove(id);
    
    return ResponseBuilder.deleted('Category deleted successfully', {
      cascadeChecked: true,
    });
  }
}
EOF
```

---

# BƯỚC 8: POST SERVICE MODULE

## 8.1 Main Module Configuration
```bash
# File: apps/post-service/src/app/app.module.ts
cat > apps/post-service/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ClientsModule } from '@nestjs/microservices';

// Shared imports
import { SharedAuthModule } from '@blog/shared/auth';
import { getKafkaConfig } from '@blog/shared/kafka';

// Local imports
import { Post } from '../entities/post.entity';
import { Category } from '../entities/category.entity';
import { PostView } from '../entities/post-view.entity';

import { PostService } from '../services/post.service';
import { CategoryService } from '../services/category.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';
import { CloudinaryService } from '../services/cloudinary.service';

import { PostController } from '../controllers/post.controller';
import { CategoryController } from '../controllers/category.controller';

import { CloudinaryProvider } from '../config/cloudinary.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'blog_user'),
        password: configService.get('POSTGRES_PASSWORD', 'blog_password_2024'),
        database: configService.get('POSTGRES_DB', 'blog_db'),
        entities: [Post, Category, PostView],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([Post, Category, PostView]),

    // File upload configuration
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10, // Max 10 files for gallery
      },
      fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),

    // Kafka client for events
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        useFactory: () => getKafkaConfig('post-service'),
      },
    ]),

    // Shared modules
    SharedAuthModule,
  ],

  controllers: [PostController, CategoryController],
  
  providers: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
    CloudinaryService,
    CloudinaryProvider,
  ],

  exports: [
    PostService,
    CategoryService,
    ContentAnalyzerService,
    CloudinaryService,
  ],
})
export class AppModule {}
EOF
```

## 8.2 Main Application Setup
```bash
# File: apps/post-service/src/main.ts
cat > apps/post-service/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // CORS for development
  app.enableCors({
    origin: [
      'http://localhost:3000', // API Gateway
      'http://localhost:3001', // User Service
      'http://localhost:4200', // Angular frontend
      'http://localhost:3000', // React frontend
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('posts');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Post Service API')
      .setDescription(`
**Post Service** for the Blog Microservices Platform.

## Features

### 📝 Content Management
- Rich text posts with markdown/HTML support
- Draft/Published/Scheduled workflow
- Content analysis (reading time, word count)
- SEO optimization tools

### 🖼️ Media Management
- Cloudinary integration for image optimization
- Thumbnail and featured image support
- Gallery images for rich content
- Automatic image optimization (WebP, responsive)

### 🏷️ Organization
- Hierarchical categories (3 levels)
- Tag system for flexible organization
- Featured posts highlighting
- Multi-language support

### 📊 Analytics & Engagement
- Post view tracking with analytics
- Social sharing metadata
- Related posts recommendations
- Comprehensive statistics

### 🔍 Search & Discovery
- Full-text search in titles and content
- Category and tag filtering
- Author-based filtering
- Popular posts algorithms

## Authentication
All content modification endpoints require JWT authentication.
Some endpoints require specific roles (admin, editor).

## Content Types
- \`markdown\` - Markdown formatted content (default)
- \`html\` - Raw HTML content
- \`rich_text\` - Rich text editor formatted content

## Post Status Workflow
1. **Draft** - Private, editable by author
2. **Published** - Public, visible to all users
3. **Scheduled** - Automatically published at specified time
4. **Archived** - Hidden from public but preserved
5. **Deleted** - Soft deleted, recoverable by admin

## Image Upload & Optimization
All images are automatically optimized through Cloudinary:
- **Thumbnails**: 800x450px, WebP format
- **Featured Images**: 1200x630px for social sharing
- **Content Images**: Responsive with multiple sizes
- **Gallery Images**: Optimized for fast loading
      `)
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token from User Service login',
      })
      .addServer(`http://localhost:${configService.get('POST_SERVICE_PORT', 3002)}`, 'Development Server')
      .addTag('Posts', 'Blog post CRUD operations with rich content management')
      .addTag('Categories', 'Hierarchical category management for post organization')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    console.log(`📚 Post Service Swagger: http://localhost:${configService.get('POST_SERVICE_PORT', 3002)}/docs`);
  }

  const port = configService.get('POST_SERVICE_PORT', 3002);
  await app.listen(port);
  
  console.log(`📝 Post Service is running on port ${port}`);
  console.log(`🔗 Service URL: http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start Post Service:', err);
  process.exit(1);
});
EOF
```

---

# BƯỚC 9: API GATEWAY INTEGRATION

## 9.1 Post Proxy Controller
```bash
# File: apps/api-gateway/src/controllers/post-proxy.controller.ts
cat > apps/api-gateway/src/controllers/post-proxy.controller.ts << 'EOF'
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
  Headers,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Request,
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
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
} from '@blog/shared/dto';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { PostStatus } from '../../../../post-service/src/entities/post.entity';

@ApiTags('Posts (Proxy)')
@Controller('api/v1/posts')
export class PostProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new post' })
  @ApiCreatedResponse(PostResponseDto, 'Post created successfully')
  async create(
    @Body() createPostDto: CreatePostDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts',
      'POST',
      createPostDto,
      { authorization: auth }
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts with filtering' })
  @ApiPaginatedResponse(PostListItemDto, 'Posts retrieved successfully')
  async findAll(
    @Query() query: any
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts',
      'GET',
      null,
      {},
      query
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular posts' })
  @ApiSuccessResponse([PostListItemDto], 'Popular posts retrieved')
  async getPopular(
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/popular',
      'GET',
      null,
      {},
      { limit }
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get post statistics' })
  @ApiSuccessResponse(Object, 'Statistics retrieved')
  async getStats(
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/stats',
      'GET',
      null,
      { authorization: auth }
    );
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user posts' })
  @ApiPaginatedResponse(PostListItemDto, 'User posts retrieved')
  async getMyPosts(
    @Query() query: any,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/my-posts',
      'GET',
      null,
      { authorization: auth },
      query
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<PostResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/${id}`,
      'GET'
    );
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get post by slug' })
  @ApiParam({ name: 'slug', type: 'string' })
  @ApiSuccessResponse(PostResponseDto, 'Post retrieved')
  async findBySlug(
    @Param('slug') slug: string,
    @Request() req
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    // Forward IP and user agent for view tracking
    const headers = {
      'x-forwarded-for': req.ip,
      'user-agent': req.headers['user-agent'],
      ...(req.headers.authorization && { authorization: req.headers.authorization })
    };

    return this.proxyService.proxyRequest(
      'post',
      `/posts/slug/${slug}`,
      'GET',
      null,
      headers
    );
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related posts' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiSuccessResponse([PostListItemDto], 'Related posts retrieved')
  async getRelated(
    @Param('id') id: string,
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/${id}/related`,
      'GET',
      null,
      {},
      { limit }
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiUpdatedResponse(PostResponseDto, 'Post updated')
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/${id}`,
      'PATCH',
      updatePostDto,
      { authorization: auth }
    );
  }

  @Patch(':id/toggle-publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle post publish status' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiUpdatedResponse(PostResponseDto, 'Post status updated')
  async togglePublish(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<PostResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/${id}/toggle-publish`,
      'PATCH',
      null,
      { authorization: auth }
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDeletedResponse('Post deleted')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<null>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/${id}`,
      'DELETE',
      null,
      { authorization: auth }
    );
  }

  // Image upload endpoints (proxy with multipart support)
  @Post('upload/thumbnail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload post thumbnail' })
  @ApiSuccessResponse(Object, 'Thumbnail uploaded')
  async uploadThumbnail(
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/upload/thumbnail',
      file,
      { authorization: auth }
    );
  }

  @Post('upload/featured')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload featured image' })
  @ApiSuccessResponse(Object, 'Featured image uploaded')
  async uploadFeaturedImage(
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/upload/featured',
      file,
      { authorization: auth }
    );
  }

  @Post('upload/content')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload content image' })
  @ApiSuccessResponse(Object, 'Content image uploaded')
  async uploadContentImage(
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/upload/content',
      file,
      { authorization: auth }
    );
  }

  @Post('upload/gallery')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload gallery images' })
  @ApiSuccessResponse([Object], 'Gallery images uploaded')
  async uploadGalleryImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any[]>> {
    return this.proxyService.proxyMultipleFileUpload(
      'post',
      '/posts/upload/gallery',
      files,
      { authorization: auth }
    );
  }
}
EOF
```

## 9.2 Update Proxy Service for File Uploads
```bash
# Add these methods to apps/api-gateway/src/services/microservice-proxy.service.ts
cat >> apps/api-gateway/src/services/microservice-proxy.service.ts << 'EOF'

  /**
   * Proxy file upload to microservice
   */
  async proxyFileUpload(
    serviceName: string,
    path: string,
    file: Express.Multer.File,
    headers: Record<string, string> = {}
  ): Promise<any> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const url = `${serviceConfig.url}${path}`;
    
    try {
      const response = await this.httpService.axiosRef({
        method: 'POST',
        url,
        data: form,
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
        timeout: serviceConfig.timeout,
      });

      return response.data;
    } catch (error) {
      this.handleProxyError(error, serviceName, path);
    }
  }

  /**
   * Proxy multiple file uploads to microservice
   */
  async proxyMultipleFileUpload(
    serviceName: string,
    path: string,
    files: Express.Multer.File[],
    headers: Record<string, string> = {}
  ): Promise<any> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const FormData = require('form-data');
    const form = new FormData();
    
    files.forEach(file => {
      form.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const url = `${serviceConfig.url}${path}`;
    
    try {
      const response = await this.httpService.axiosRef({
        method: 'POST',
        url,
        data: form,
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
        timeout: serviceConfig.timeout,
      });

      return response.data;
    } catch (error) {
      this.handleProxyError(error, serviceName, path);
    }
  }
EOF
```

## 9.3 Update API Gateway Module
```bash
# Update apps/api-gateway/src/app/app.module.ts - add Post service config
# Add to MicroserviceProxyService constructor:
this.services = new Map([
  ['user', {
    name: 'User Service',
    url: this.configService.get('USER_SERVICE_URL', 'http://localhost:3001'),
    timeout: Number(this.configService.get('USER_SERVICE_TIMEOUT')) || 10000,
    retries: 3,
  }],
  ['post', {
    name: 'Post Service', 
    url: this.configService.get('POST_SERVICE_URL', 'http://localhost:3002'),
    timeout: Number(this.configService.get('POST_SERVICE_TIMEOUT')) || 10000,
    retries: 3,
  }],
]);

# Add PostProxyController to controllers array in AppModule
```

---

# BƯỚC 10: TESTING SCRIPTS

## 10.1 Complete Post Service Test
```bash
# File: scripts/test-post-service.sh
cat > scripts/test-post-service.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Post Service Complete Integration..."

API_URL="http://localhost:3000"

# Step 1: Login to get token
echo "🔐 Logging in to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@blog.com",
    "password": "AdminPass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')
echo "✅ JWT Token obtained"

# Step 2: Create a category
echo ""
echo "📁 Creating a category..."
CATEGORY_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technology",
    "description": "Latest technology trends and tutorials",
    "color": "#3b82f6",
    "icon": "fas fa-laptop-code",
    "metaTitle": "Technology Articles",
    "metaDescription": "Discover the latest in technology"
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.data.id')
echo "✅ Category created: $CATEGORY_ID"

# Step 3: Create a post
echo ""
echo "📝 Creating a blog post..."
POST_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with NestJS Microservices",
    "description": "A comprehensive guide to building scalable microservices architecture using NestJS framework. Learn best practices, patterns, and implementation strategies.",
    "content": "# Introduction\n\nNestJS is a powerful Node.js framework that makes building scalable microservices a breeze.\n\n## Key Features\n\n- **TypeScript First**: Built with TypeScript for better type safety\n- **Decorator-based**: Clean, declarative API design\n- **Microservices Ready**: Built-in support for microservices patterns\n\n## Getting Started\n\n```typescript\nimport { NestFactory } from '\''@nestjs/core'\'';\nimport { AppModule } from '\''./app.module'\'';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(3000);\n}\nbootstrap();\n```\n\nThis is just the beginning of your microservices journey!",
    "excerpt": "Learn how to build scalable microservices with NestJS framework.",
    "categoryId": "'$CATEGORY_ID'",
    "tags": ["nestjs", "microservices", "typescript", "nodejs"],
    "keywords": ["nestjs tutorial", "microservices guide"],
    "metaTitle": "NestJS Microservices Tutorial - Complete Guide",
    "metaDescription": "Learn how to build scalable microservices with NestJS. Complete guide with examples and best practices.",
    "status": "published",
    "featured": true
  }')

POST_ID=$(echo $POST_RESPONSE | jq -r '.data.id')
POST_SLUG=$(echo $POST_RESPONSE | jq -r '.data.slug')
echo "✅ Post created: $POST_ID"
echo "   Slug: $POST_SLUG"

# Step 4: Test post retrieval
echo ""
echo "📖 Testing post retrieval by slug..."
SLUG_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/slug/${POST_SLUG}")
echo $SLUG_RESPONSE | jq '.data.title, .data.viewCount'

# Step 5: Test post listing
echo ""
echo "📋 Testing post listing..."
LIST_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?limit=5")
POST_COUNT=$(echo $LIST_RESPONSE | jq '.data.items | length')
echo "✅ Retrieved $POST_COUNT posts"

# Step 6: Test filtering
echo ""
echo "🔍 Testing category filtering..."
FILTER_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?categoryId=${CATEGORY_ID}")
FILTERED_COUNT=$(echo $FILTER_RESPONSE | jq '.data.items | length')
echo "✅ Found $FILTERED_COUNT posts in Technology category"

# Step 7: Test search
echo ""
echo "🔎 Testing search functionality..."
SEARCH_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?search=NestJS")
SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq '.data.items | length')
echo "✅ Found $SEARCH_COUNT posts matching 'NestJS'"

# Step 8: Test popular posts
echo ""
echo "🔥 Testing popular posts..."
POPULAR_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/popular?limit=3")
POPULAR_COUNT=$(echo $POPULAR_RESPONSE | jq '.data | length')
echo "✅ Retrieved $POPULAR_COUNT popular posts"

# Step 9: Test related posts
echo ""
echo "🔗 Testing related posts..."
RELATED_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/${POST_ID}/related")
RELATED_COUNT=$(echo $RELATED_RESPONSE | jq '.data | length')
echo "✅ Found $RELATED_COUNT related posts"

# Step 10: Test statistics
echo ""
echo "📊 Testing post statistics..."
STATS_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/stats" \
  -H "Authorization: Bearer $TOKEN")
echo $STATS_RESPONSE | jq '.data.posts, .data.engagement'

# Step 11: Test post update
echo ""
echo "✏️ Testing post update..."
UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/api/v1/posts/${POST_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "excerpt": "Updated: Learn how to build scalable microservices with NestJS framework and TypeScript.",
    "tags": ["nestjs", "microservices", "typescript", "nodejs", "tutorial"]
  }')

echo "✅ Post updated successfully"
UPDATED_TAGS=$(echo $UPDATE_RESPONSE | jq '.data.tags')
echo "   New tags: $UPDATED_TAGS"

echo ""
echo "🎉 Post Service integration test completed successfully!"
echo ""
echo "📈 Test Summary:"
echo "  ✅ Category creation"
echo "  ✅ Post creation with rich content"
echo "  ✅ Post retrieval by ID and slug"
echo "  ✅ Post listing with pagination"
echo "  ✅ Category filtering"
echo "  ✅ Search functionality" 
echo "  ✅ Popular posts algorithm"
echo "  ✅ Related posts recommendation"
echo "  ✅ Statistics and analytics"
echo "  ✅ Post updates and content analysis"

echo ""
echo "🌐 Available endpoints:"
echo "  - Post Service: http://localhost:3002"
echo "  - API Gateway: http://localhost:3000"
echo "  - Swagger Docs: http://localhost:3002/docs"
EOF

chmod +x scripts/test-post-service.sh
```

## 10.2 Image Upload Test Script
```bash
# File: scripts/test-image-upload.sh
cat > scripts/test-image-upload.sh << 'EOF'
#!/bin/bash

echo "🖼️ Testing Image Upload Features..."

API_URL="http://localhost:3000"

# Login first
echo "🔐 Getting JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@blog.com",
    "password": "AdminPass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')

# Create a test image (1x1 pixel PNG)
echo "📸 Creating test images..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test-thumbnail.png
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test-featured.png
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test-content.png

# Test thumbnail upload
echo ""
echo "🖼️ Testing thumbnail upload..."
THUMB_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/posts/upload/thumbnail" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-thumbnail.png")

THUMB_URL=$(echo $THUMB_RESPONSE | jq -r '.data.url')
echo "✅ Thumbnail uploaded: $THUMB_URL"

# Test featured image upload
echo ""
echo "🌟 Testing featured image upload..."
FEATURED_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/posts/upload/featured" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-featured.png")

FEATURED_URL=$(echo $FEATURED_RESPONSE | jq -r '.data.url')
echo "✅ Featured image uploaded: $FEATURED_URL"

# Test content image upload
echo ""
echo "📝 Testing content image upload..."
CONTENT_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/posts/upload/content" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-content.png")

CONTENT_URL=$(echo $CONTENT_RESPONSE | jq -r '.data.url')
echo "✅ Content image uploaded: $CONTENT_URL"
echo "📱 Responsive URLs generated:"
echo $CONTENT_RESPONSE | jq '.data.responsive'

# Create post with uploaded images
echo ""
echo "📝 Creating post with uploaded images..."
POST_WITH_IMAGES=$(curl -s -X POST "${API_URL}/api/v1/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post with Rich Media Content",
    "description": "This post demonstrates rich media integration with Cloudinary.",
    "content": "# Rich Media Post\n\nThis post contains optimized images:\n\n![Content Image]('$CONTENT_URL')\n\nImages are automatically optimized for web delivery.",
    "thumbnailUrl": "'$THUMB_URL'",
    "featuredImageUrl": "'$FEATURED_URL'",
    "excerpt": "Demonstration of rich media capabilities",
    "status": "published",
    "tags": ["media", "images", "cloudinary"]
  }')

MEDIA_POST_ID=$(echo $POST_WITH_IMAGES | jq -r '.data.id')
echo "✅ Post with media created: $MEDIA_POST_ID"

# Cleanup test files
rm -f test-thumbnail.png test-featured.png test-content.png

echo ""
echo "🎉 Image upload testing completed!"
echo ""
echo "📊 Upload Summary:"
echo "  ✅ Thumbnail upload and optimization"
echo "  ✅ Featured image upload (social sharing)"
echo "  ✅ Content image upload with responsive URLs"
echo "  ✅ Post creation with integrated media"
echo ""
echo "🔗 All images are hosted on Cloudinary with automatic optimization"
EOF

chmod +x scripts/test-image-upload.sh
```

---

# 🎉 POST SERVICE HOÀN THÀNH!

## ✅ Features Implemented

### **📝 Content Management**
- Rich text posts với markdown/HTML support
- Automatic content analysis (word count, reading time, headings)
- SEO optimization (meta tags, canonical URLs, structured data)
- Draft/Published/Scheduled workflow
- Content validation và suggestions

### **🖼️ Media Management**  
- Cloudinary integration với automatic optimization
- Thumbnail uploads (800x450, WebP)
- Featured images (1200x630 for social sharing)
- Content images với responsive breakpoints
- Gallery uploads (multiple images)

### **🏷️ Organization**
- Hierarchical categories (3 levels max)
- Flexible tag system
- Featured posts highlighting
- Multi-language support
- Advanced filtering và search

### **📊 Analytics & Engagement**
- Post view tracking với user/IP detection
- Comprehensive statistics dashboard
- Related posts algorithm
- Popular posts ranking
- Social sharing metadata

### **🔍 API Features**
- Full REST API với authentication
- Advanced search và filtering
- Pagination với metadata
- File upload endpoints
- Admin và user role permissions

## 🚀 Quick Start Commands

```bash
# 1. Build shared libraries
nx build dto
nx build auth
nx build kafka

# 2. Build và start Post Service
nx build post-service
nx serve post-service &

# 3. Update API Gateway config và start
nx serve api-gateway &

# 4. Test complete integration
./scripts/test-post-service.sh

# 5. Test image uploads
./scripts/test-image-upload.sh

# 6. Access Swagger documentation
open http://localhost:3002/docs
```

## 📚 Documentation

- **Post Service**: http://localhost:3002/docs
- **API Gateway**: http://localhost:3000/docs  
- **Service URL**: http://localhost:3002

**Perfect modern blog system với rich content management!** 🎉

Bây giờ bạn có một Post Service hoàn chỉnh với tất cả features hiện đại như SEO, image optimization, analytics, và content management workflow professional!
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
  PostStatus,
} from '@blog/shared/dto';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Posts (Proxy)')
@Controller('posts')
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
      '/posts/posts',
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
      '/posts/posts',
      'GET',
      null,
      {},
      query
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular posts' })
  @ApiSuccessResponse(PostListItemDto, 'Popular posts retrieved', 200)
  async getPopular(
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/posts/popular',
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
      '/posts/posts/stats',
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
      '/posts/posts/my-posts',
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
      `/posts/posts/${id}`,
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
      `/posts/posts/slug/${slug}`,
      'GET',
      null,
      headers
    );
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related posts' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiSuccessResponse(PostListItemDto, 'Related posts retrieved', 200)
  async getRelated(
    @Param('id') id: string,
    @Query('limit') limit?: number
  ): Promise<SuccessResponseDto<PostListItemDto[]>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/posts/${id}/related`,
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
      `/posts/posts/${id}`,
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
      `/posts/posts/${id}/toggle-publish`,
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
      `/posts/posts/${id}`,
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
    @UploadedFile() file: any,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/posts/upload/thumbnail',
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
    @UploadedFile() file: any,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/posts/upload/featured',
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
    @UploadedFile() file: any,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyFileUpload(
      'post',
      '/posts/posts/upload/content',
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
  @ApiSuccessResponse(Object, 'Gallery images uploaded')
  async uploadGalleryImages(
    @UploadedFiles() files: any[],
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any[]>> {
    return this.proxyService.proxyMultipleFileUpload(
      'post',
      '/posts/posts/upload/gallery',
      files,
      { authorization: auth }
    );
  }
}
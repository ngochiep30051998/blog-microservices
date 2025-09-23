import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Ip,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard } from '@blog/shared/auth';
import {
  UploadFileDto,
  UpdateFileDto,
  FileUploadResponseDto,
  FileListItemDto,
  FileStatsDto,
  BulkDeleteDto,
  PaginationDto,
  SuccessResponseDto,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
  FileType,
  UploadStatus,
} from '@blog/shared/dto';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('File Management')
@Controller({ path: 'files', version: '1' })
export class FilesProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Post('upload-single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a single file',
    description: `
Upload a single file with metadata to Cloudinary and store information in MongoDB.

**Supported File Types:**
- **Images**: JPEG, PNG, WebP, GIF (max 5MB)
- **Videos**: MP4, WebM, QuickTime, AVI (max 100MB)
- **Audio**: MP3, WAV, OGG (max 50MB)
- **Documents**: PDF, DOC, DOCX, TXT, CSV (max 10MB)

**Features:**
- Automatic optimization based on file type
- Responsive image generation
- Metadata storage in MongoDB
- CDN delivery via Cloudinary
- File tracking and analytics
- SEO optimization
    `
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload'
        },
        type: {
          type: 'string',
          enum: Object.values(FileType),
          description: 'File type classification'
        },
        alt: {
          type: 'string',
          description: 'Alt text for accessibility'
        },
        caption: {
          type: 'string',
          description: 'Caption for the file'
        },
        description: {
          type: 'string',
          description: 'Description of the file'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for organizing files'
        },
        relatedPostId: {
          type: 'string',
          description: 'Related post ID'
        },
        relatedCategoryId: {
          type: 'string',
          description: 'Related category ID'
        },
        seoTitle: {
          type: 'string',
          description: 'SEO title'
        },
        seoDescription: {
          type: 'string',
          description: 'SEO description'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'SEO keywords'
        }
      },
      required: ['file', 'type']
    }
  })
  @ApiCreatedResponse(FileUploadResponseDto, 'File uploaded successfully')
  async uploadSingle(
    @UploadedFile() file: any,
    @Body() uploadDto: UploadFileDto,
    @Headers('authorization') auth: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    // Extract form data from DTO (exclude ip and userAgent)
    const formData = {
      type: uploadDto.type,
      alt: uploadDto.alt,
      caption: uploadDto.caption,
      description: uploadDto.description,
      tags: uploadDto.tags,
      relatedPostId: uploadDto.relatedPostId,
      relatedCategoryId: uploadDto.relatedCategoryId,
      seoTitle: uploadDto.seoTitle,
      seoDescription: uploadDto.seoDescription,
      keywords: uploadDto.keywords,
    };

    return this.proxyService.proxyFileUpload(
      'files',
      '/files/upload-single',
      file,
      formData,
      { authorization: auth },
      ip,
      userAgent
    );
  }

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload multiple files at once (max 10 files). All files will use the same metadata.'
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadMultiple(
    @UploadedFiles() files: any[],
    @Body() uploadDto: UploadFileDto,
    @Headers('authorization') auth: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto[]>> {
    // Extract form data from DTO (exclude ip and userAgent)
    const formData = {
      type: uploadDto.type,
      alt: uploadDto.alt,
      caption: uploadDto.caption,
      description: uploadDto.description,
      tags: uploadDto.tags,
      relatedPostId: uploadDto.relatedPostId,
      relatedCategoryId: uploadDto.relatedCategoryId,
      seoTitle: uploadDto.seoTitle,
      seoDescription: uploadDto.seoDescription,
      keywords: uploadDto.keywords,
    };

    return this.proxyService.proxyMultipleFileUpload(
      'files',
      '/files/upload-multiple',
      files,
      formData,
      { authorization: auth },
      ip,
      userAgent
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all files with pagination and filtering',
    description: `
Retrieve paginated list of uploaded files with advanced filtering options.

**Filtering Options:**
- \`type\` - Filter by file type (thumbnail, featured, content, etc.)
- \`status\` - Filter by upload status (success, failed, processing, etc.)
- \`uploadedBy\` - Filter by uploader user ID
- \`relatedPostId\` - Filter by related post ID
- \`tags\` - Filter by tags (comma-separated)
- \`search\` - Full-text search in filename, alt text, and description
    `
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: FileType })
  @ApiQuery({ name: 'status', required: false, enum: UploadStatus })
  @ApiQuery({ name: 'uploadedBy', required: false, type: String })
  @ApiQuery({ name: 'relatedPostId', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiPaginatedResponse(FileListItemDto, 'Files retrieved successfully')
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: FileType,
    @Query('status') status?: UploadStatus,
    @Query('uploadedBy') uploadedBy?: string,
    @Query('relatedPostId') relatedPostId?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Headers('authorization') auth?: string
  ): Promise<SuccessResponseDto<any>> {
    const queryParams = {
      ...paginationDto,
      ...(type && { type }),
      ...(status && { status }),
      ...(uploadedBy && { uploadedBy }),
      ...(relatedPostId && { relatedPostId }),
      ...(tags && { tags }),
      ...(search && { search }),
    };

    return this.proxyService.proxyRequest(
      'files',
      '/files',
      'GET',
      null,
      { authorization: auth },
      queryParams
    );
  }

  @Get('my-files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user files',
    description: 'Get paginated list of files uploaded by the current user'
  })
  @ApiPaginatedResponse(FileListItemDto, 'User files retrieved successfully')
  async getMyFiles(
    @Query() paginationDto: PaginationDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'files',
      '/files/my-files',
      'GET',
      null,
      { authorization: auth },
      paginationDto
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get file statistics',
    description: 'Get comprehensive file upload and storage statistics'
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Get stats for specific user (admin only)' })
  @ApiSuccessResponse(FileStatsDto, 'Statistics retrieved successfully')
  async getStats(
    @Query('userId') userId?: string,
    @Headers('authorization') auth?: string
  ): Promise<SuccessResponseDto<FileStatsDto>> {
    const queryParams = userId ? { userId } : {};

    return this.proxyService.proxyRequest(
      'files',
      '/files/stats',
      'GET',
      null,
      { authorization: auth },
      queryParams
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get file by ID',
    description: 'Retrieve detailed information about a specific file'
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiSuccessResponse(FileUploadResponseDto, 'File retrieved successfully')
  async findById(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    return this.proxyService.proxyRequest(
      'files',
      `/files/${id}`,
      'GET',
      null,
      { authorization: auth }
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update file metadata (alt text, caption, tags, etc.). Only the file owner can update.'
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiUpdatedResponse(FileUploadResponseDto, 'File updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFileDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    return this.proxyService.proxyRequest(
      'files',
      `/files/${id}`,
      'PATCH',
      updateDto,
      { authorization: auth }
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete file',
    description: 'Soft delete a file. Only the file owner can delete. File will be removed from Cloudinary.'
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'reason', required: false, type: String, description: 'Reason for deletion' })
  @ApiDeletedResponse('File deleted successfully')
  async remove(
    @Param('id') id: string,
    @Query('reason') reason?: string,
    @Headers('authorization') auth?: string
  ): Promise<SuccessResponseDto<null>> {
    const queryParams = reason ? { reason } : {};

    return this.proxyService.proxyRequest(
      'files',
      `/files/${id}`,
      'DELETE',
      null,
      { authorization: auth },
      queryParams
    );
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete files',
    description: 'Delete multiple files at once. Only file owners can delete their files.'
  })
  @ApiSuccessResponse(Object, 'Bulk delete completed')
  async bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<{
    deleted: number;
    errors: string[];
  }>> {
    return this.proxyService.proxyRequest(
      'files',
      '/files/bulk-delete',
      'POST',
      bulkDeleteDto,
      { authorization: auth }
    );
  }

  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track file download',
    description: 'Increment download counter for analytics. Call this when user downloads/views the file.'
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiSuccessResponse(Object, 'Download tracked successfully')
  async trackDownload(
    @Param('id') id: string,
    @Headers('authorization') auth?: string
  ): Promise<SuccessResponseDto<{ message: string }>> {
    return this.proxyService.proxyRequest(
      'files',
      `/files/${id}/download`,
      'POST',
      null,
      { authorization: auth }
    );
  }
}

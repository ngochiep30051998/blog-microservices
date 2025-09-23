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
  ValidationPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Ip,
  Headers,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

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
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
  ApiPaginatedResponse,
  FileType,
  UploadStatus,
} from '@blog/shared/dto';
import { FilesService } from '../services/files.service';

// Local imports

@ApiTags('File management')
@Controller('files')
@UseGuards(ThrottlerGuard) // Rate limiting
export class UploadController {
  constructor(private readonly fileServices: FilesService) {}

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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB max
        ],
        fileIsRequired: true,
      })
    ) file: any,
    @Body() uploadDto: UploadFileDto,
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.fileServices.uploadFile(
      file,
      uploadDto,
      req.user.id,
      req.user.username || `${req.user.firstName} ${req.user.lastName}`.trim(),
      ip,
      userAgent
    );

    return ResponseBuilder.created(result, 'File uploaded successfully', {
      fileType: uploadDto.type,
      fileSize: this.formatFileSize(file.size),
      processingTime: 'optimized',
    });
  }

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload multiple files at once (max 10 files). All files will use the same metadata.'
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadMultiple(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB max per file
        ],
        fileIsRequired: true,
      })
    ) files: any[],
    @Body() uploadDto: UploadFileDto,
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<SuccessResponseDto<FileUploadResponseDto[]>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed per upload');
    }

    const results = await this.fileServices.uploadMultipleFiles(
      files,
      uploadDto,
      req.user.id,
      req.user.username || `${req.user.firstName} ${req.user.lastName}`.trim(),
      ip,
      userAgent
    );

    return ResponseBuilder.created(
      results,
      `${results.length} files uploaded successfully`,
      {
        totalFiles: files.length,
        successfulUploads: results.length,
        failedUploads: files.length - results.length,
      }
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
  ): Promise<SuccessResponseDto<any>> {
    const filters = {
      type,
      status,
      uploadedBy,
      relatedPostId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      search,
    };

    const result = await this.fileServices.findAll(paginationDto, filters);

    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      'Files retrieved successfully'
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
    @Request() req: any
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.fileServices.getFilesByUser(req.user.id, paginationDto);

    return ResponseBuilder.paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      'User files retrieved successfully'
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
    @Request() req: any,
    @Query('userId') userId?: string
  ): Promise<SuccessResponseDto<FileStatsDto>> {
    // For now, only allow users to see their own stats
    // TODO: Add admin role check for viewing other users' stats
    const targetUserId = userId && req.user.role === 'admin' ? userId : req.user.id;

    const stats = await this.fileServices.getStats(targetUserId);

    return ResponseBuilder.success(
      stats,
      'Statistics retrieved successfully',
      HttpStatus.OK,
      { scope: targetUserId ? 'user' : 'global' }
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
    @Request() req: any
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    const file = await this.fileServices.findById(id, req.user.id);

    return ResponseBuilder.success(file, 'File retrieved successfully');
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
    @Request() req: any
  ): Promise<SuccessResponseDto<FileUploadResponseDto>> {
    const file = await this.fileServices.updateFile(id, updateDto, req.user.id);

    return ResponseBuilder.updated(file, 'File updated successfully', {
      updatedFields: Object.keys(updateDto),
      version: file.version,
    });
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
    @Request() req: any,
    @Query('reason') reason?: string
  ): Promise<SuccessResponseDto<null>> {
    await this.fileServices.deleteFile(id, req.user.id, reason);

    return ResponseBuilder.deleted('File deleted successfully', {
      deletedBy: req.user.id,
      reason: reason || 'No reason provided',
      type: 'soft_delete',
    });
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
    @Request() req: any
  ): Promise<SuccessResponseDto<{
    deleted: number;
    errors: string[];
  }>> {
    const result = await this.fileServices.bulkDelete(bulkDeleteDto, req.user.id);

    const message = result.errors.length > 0
      ? `${result.deleted} files deleted, ${result.errors.length} errors`
      : `${result.deleted} files deleted successfully`;

    return ResponseBuilder.success(result, message, HttpStatus.OK, {
      hasErrors: result.errors.length > 0,
    });
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
    @Param('id') id: string
  ): Promise<SuccessResponseDto<{ message: string }>> {
    await this.fileServices.trackDownload(id);

    return ResponseBuilder.success(
      { message: 'Download tracked' },
      'Download tracked successfully'
    );
  }
  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
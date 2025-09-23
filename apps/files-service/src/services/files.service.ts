import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  FileUpload, 
  FileUploadDocument, 
  FileType, 
  UploadStatus 
} from '../entities/file-upload.entity';
import { CloudinaryService } from './cloudinary.service';
import { 
  UploadFileDto, 
  UpdateFileDto, 
  FileUploadResponseDto, 
  FileListItemDto, 
  FileStatsDto,
  BulkDeleteDto,
  PaginationDto 
} from '@blog/shared/dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileUpload.name) 
    private fileUploadModel: Model<FileUploadDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Upload a single file
   */
  async uploadFile(
    file: any, 
    uploadDto: UploadFileDto, 
    userId: string, 
    userName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<FileUploadResponseDto> {
    // Create initial database record
    const fileRecord = new this.fileUploadModel({
      originalName: file.originalname,
      filename: file.filename || file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: uploadDto.type,
      status: UploadStatus.UPLOADING,
      uploadedBy: userId,
      uploadedByName: userName,
      ipAddress,
      userAgent,
      processingStartedAt: new Date(),
      alt: uploadDto.alt,
      caption: uploadDto.caption,
      description: uploadDto.description,
      tags: uploadDto.tags || [],
      relatedPostId: uploadDto.relatedPostId,
      relatedCategoryId: uploadDto.relatedCategoryId,
      seoTitle: uploadDto.seoTitle,
      seoDescription: uploadDto.seoDescription,
      keywords: uploadDto.keywords || [],
      // Temporary values - will be updated after upload
      cloudinaryPublicId: '',
      cloudinaryUrl: '',
    });
    await fileRecord.save();

    try {
      // Upload to Cloudinary
      console.log('Cloudinary upload result:');
      const cloudinaryResult = await this.cloudinaryService.uploadFile(file, uploadDto.type);
      // Generate responsive URLs for images
      let responsiveUrls;
      if (this.isImageType(uploadDto.type)) {
        responsiveUrls = this.cloudinaryService.generateResponsiveUrls(cloudinaryResult.publicId);
      }

      // Update database record with upload results
      fileRecord.status = UploadStatus.SUCCESS;
      fileRecord.cloudinaryPublicId = cloudinaryResult.publicId;
      fileRecord.cloudinaryUrl = cloudinaryResult.url;
      fileRecord.cloudinarySecureUrl = cloudinaryResult.secureUrl;
      fileRecord.width = cloudinaryResult.width;
      fileRecord.height = cloudinaryResult.height;
      fileRecord.format = cloudinaryResult.format;
      fileRecord.bytes = cloudinaryResult.bytes;
      fileRecord.resourceType = cloudinaryResult.resourceType;
      fileRecord.responsiveUrls = responsiveUrls;
      fileRecord.processingCompletedAt = new Date();

      // Calculate compression ratio for images
      if (this.isImageType(uploadDto.type) && cloudinaryResult.bytes !== file.size) {
        fileRecord.compressionRatio = (1 - cloudinaryResult.bytes / file.size) * 100;
      }

      fileRecord.originalFormat = file.mimetype.split('/')[1];

      await fileRecord.save();

      return this.mapToResponseDto(fileRecord);

    } catch (error: any) {
      // Update record with error status
      fileRecord.status = UploadStatus.FAILED;
      fileRecord.processingError = error.message;
      fileRecord.processingCompletedAt = new Date();
      await fileRecord.save();

      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: any[], 
    uploadDto: UploadFileDto, 
    userId: string, 
    userName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<FileUploadResponseDto[]> {
    const results = await Promise.allSettled(
      files.map(file => this.uploadFile(file, uploadDto, userId, userName, ipAddress, userAgent))
    );

    const successfulUploads: FileUploadResponseDto[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulUploads.push(result.value);
      } else {
        errors.push(`File ${index + 1}: ${result.reason.message}`);
      }
    });

    if (errors.length > 0) {
      console.warn('Some files failed to upload:', errors);
    }

    return successfulUploads;
  }

  /**
   * Get file by ID
   */
  async findById(id: string, userId?: string): Promise<FileUploadResponseDto> {
    const file = await this.fileUploadModel.findById(id).exec();
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.isDeleted) {
      throw new NotFoundException('File has been deleted');
    }

    // Update view count and last accessed
    await this.fileUploadModel.updateOne(
      { _id: id },
      { 
        $inc: { viewCount: 1 },
        lastAccessedAt: new Date()
      }
    ).exec();

    return this.mapToResponseDto(file);
  }

  /**
   * Get files with pagination and filtering
   */
  async findAll(
    pagination: PaginationDto,
    filters: {
      type?: FileType;
      status?: UploadStatus;
      uploadedBy?: string;
      relatedPostId?: string;
      tags?: string[];
      search?: string;
    } = {}
  ): Promise<{
    items: FileListItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isDeleted: false };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    if (filters.relatedPostId) {
      query.relatedPostId = filters.relatedPostId;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.search) {
      query.$or = [
        { originalName: { $regex: filters.search, $options: 'i' } },
        { alt: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } },
      ];
    }

    // Execute query
    const [items, total] = await Promise.all([
      this.fileUploadModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.fileUploadModel.countDocuments(query).exec(),
    ]);

    return {
      items: items.map(item => this.mapToListItemDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update file metadata
   */
  async updateFile(id: string, updateDto: UpdateFileDto, userId: string): Promise<FileUploadResponseDto> {
    const file = await this.fileUploadModel.findById(id).exec();
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.isDeleted) {
      throw new NotFoundException('File has been deleted');
    }

    if (file.uploadedBy !== userId) {
      throw new ForbiddenException('You can only update your own files');
    }

    // Update fields
    Object.assign(file, updateDto);
    file.version += 1;

    await file.save();

    return this.mapToResponseDto(file);
  }

  /**
   * Soft delete file
   */
  async deleteFile(id: string, userId: string, reason?: string): Promise<void> {
    const file = await this.fileUploadModel.findById(id).exec();
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.isDeleted) {
      throw new NotFoundException('File has already been deleted');
    }

    if (file.uploadedBy !== userId) {
      throw new ForbiddenException('You can only delete your own files');
    }

    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = userId;
    file.deletionReason = reason;
    file.status = UploadStatus.DELETED;

    await file.save();

    // Optionally delete from Cloudinary (async)
    this.cloudinaryService.deleteFile(file.cloudinaryPublicId, file.resourceType)
      .catch(error => console.warn('Failed to delete from Cloudinary:', error));
  }

  /**
   * Bulk delete files
   */
  async bulkDelete(bulkDeleteDto: BulkDeleteDto, userId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const { fileIds, reason, deleteFromCloudinary = true } = bulkDeleteDto;
    
    let deleted = 0;
    const errors: string[] = [];

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId, userId, reason);
        deleted++;
      } catch (error: any) {
        errors.push(`${fileId}: ${error.message}`);
      }
    }

    return { deleted, errors };
  }

  /**
   * Get file statistics
   */
  async getStats(userId?: string): Promise<FileStatsDto> {
    const query: any = { isDeleted: false };
    if (userId) {
      query.uploadedBy = userId;
    }

    const [
      totalFiles,
      sizeAggregate,
      typeAggregate,
      statusAggregate,
      largestFile,
      mostDownloaded,
    ] = await Promise.all([
      this.fileUploadModel.countDocuments(query),
      this.fileUploadModel.aggregate([
        { $match: query },
        { $group: { _id: null, totalSize: { $sum: '$size' }, avgSize: { $avg: '$size' } } }
      ]),
      this.fileUploadModel.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      this.fileUploadModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.fileUploadModel.findOne(query).sort({ size: -1 }).exec(),
      this.fileUploadModel.findOne(query).sort({ downloadCount: -1 }).exec(),
    ]);

    const totalSize = sizeAggregate[0]?.totalSize || 0;
    const averageFileSize = sizeAggregate[0]?.avgSize || 0;

    // Build type and status counts
    const filesByType: Record<FileType, number> = Object.values(FileType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<FileType, number>);

    typeAggregate.forEach(item => {
      filesByType[item._id as FileType] = item.count;
    });

    const filesByStatus: Record<UploadStatus, number> = Object.values(UploadStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<UploadStatus, number>);

    statusAggregate.forEach(item => {
      filesByStatus[item._id as UploadStatus] = item.count;
    });

    // Recent uploads (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentUploads = await this.fileUploadModel.countDocuments({
      ...query,
      createdAt: { $gte: yesterday }
    });

    return {
      totalFiles,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
      filesByType,
      filesByStatus,
      averageFileSize,
      largestFile: largestFile ? {
        id: largestFile._id.toString(),
        filename: largestFile.filename,
        size: largestFile.size,
      } : { id: '', filename: '', size: 0 },
      mostDownloaded: mostDownloaded ? {
        id: mostDownloaded._id.toString(),
        filename: mostDownloaded.filename,
        downloadCount: mostDownloaded.downloadCount || 0,
      } : { id: '', filename: '', downloadCount: 0 },
      recentUploads,
      storageUsage: {
        used: totalSize,
        limit: 1024 * 1024 * 1024, // 1GB limit (configurable)
        percentage: (totalSize / (1024 * 1024 * 1024)) * 100,
      },
    };
  }

  /**
   * Get files by user
   */
  async getFilesByUser(userId: string, pagination: PaginationDto): Promise<{
    items: FileListItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll(pagination, { uploadedBy: userId });
  }

  /**
   * Track download
   */
  async trackDownload(id: string): Promise<void> {
    await this.fileUploadModel.updateOne(
      { _id: id },
      { $inc: { downloadCount: 1 } }
    ).exec();
  }

  /**
   * Check if file type is image
   */
  private isImageType(type: FileType): boolean {
    return [
      FileType.THUMBNAIL,
      FileType.FEATURED,
      FileType.CONTENT,
      FileType.GALLERY,
    ].includes(type);
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

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(file: FileUploadDocument): FileUploadResponseDto {
    return {
      id: file._id.toString(),
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      type: file.type,
      status: file.status,
      cloudinaryPublicId: file.cloudinaryPublicId,
      cloudinaryUrl: file.cloudinaryUrl,
      cloudinarySecureUrl: file.cloudinarySecureUrl,
      width: file.width,
      height: file.height,
      format: file.format || '',
      bytes: file.bytes || 0,
      alt: file.alt,
      caption: file.caption,
      description: file.description,
      tags: file.tags || [],
      uploadedBy: file.uploadedBy,
      uploadedByName: file.uploadedByName,
      relatedPostId: file.relatedPostId,
      relatedCategoryId: file.relatedCategoryId,
      seoTitle: file.seoTitle,
      seoDescription: file.seoDescription,
      keywords: file.keywords || [],
      responsiveUrls: file.responsiveUrls,
      downloadCount: file.downloadCount || 0,
      viewCount: file.viewCount || 0,
      lastAccessedAt: file.lastAccessedAt,
      version: file.version,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  /**
   * Map entity to list item DTO
   */
  private mapToListItemDto(file: FileUploadDocument): FileListItemDto {
    return {
      id: file._id.toString(),
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      type: file.type,
      status: file.status,
      cloudinaryUrl: file.cloudinaryUrl,
      width: file.width,
      height: file.height,
      alt: file.alt,
      tags: file.tags || [],
      uploadedBy: file.uploadedBy,
      uploadedByName: file.uploadedByName,
      downloadCount: file.downloadCount || 0,
      viewCount: file.viewCount || 0,
      createdAt: file.createdAt,
    };
  }
}
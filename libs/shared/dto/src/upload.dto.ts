import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsUUID, IsInt, IsUrl, ValidateNested, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileType {
  THUMBNAIL = 'thumbnail',
  FEATURED = 'featured',
  CONTENT = 'content',
  GALLERY = 'gallery',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

export enum UploadStatus {
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  FAILED = 'failed',
  PROCESSING = 'processing',
  DELETED = 'deleted',
}

export class UploadFileDto {
  @ApiProperty({ description: 'File type', enum: FileType })
  @IsEnum(FileType)
  type: FileType;

  @ApiPropertyOptional({ description: 'Alt text for accessibility' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @ApiPropertyOptional({ description: 'Caption for the file' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({ description: 'Description of the file' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for organizing files' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Related post ID' })
  @IsOptional()
  @IsUUID()
  relatedPostId?: string;

  @ApiPropertyOptional({ description: 'Related category ID' })
  @IsOptional()
  @IsUUID()
  relatedCategoryId?: string;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'SEO keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class UpdateFileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedPostId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class FileUploadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  mimetype!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: FileType })
  type!: FileType;

  @ApiProperty({ enum: UploadStatus })
  status!: UploadStatus;

  @ApiProperty()
  cloudinaryPublicId!: string;

  @ApiProperty()
  cloudinaryUrl!: string;

  @ApiPropertyOptional()
  cloudinarySecureUrl?: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiProperty()
  format!: string;

  @ApiProperty()
  bytes!: number;

  @ApiPropertyOptional()
  alt?: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  tags!: string[];

  @ApiProperty()
  uploadedBy!: string;

  @ApiPropertyOptional()
  uploadedByName?: string;

  @ApiPropertyOptional()
  relatedPostId?: string;

  @ApiPropertyOptional()
  relatedCategoryId?: string;

  @ApiPropertyOptional()
  seoTitle?: string;

  @ApiPropertyOptional()
  seoDescription?: string;

  @ApiProperty()
  keywords!: string[];

  @ApiPropertyOptional()
  responsiveUrls?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };

  @ApiProperty()
  downloadCount!: number;

  @ApiProperty()
  viewCount!: number;

  @ApiPropertyOptional()
  lastAccessedAt?: Date;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FileListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  mimetype!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: FileType })
  type!: FileType;

  @ApiProperty({ enum: UploadStatus })
  status!: UploadStatus;

  @ApiProperty()
  cloudinaryUrl!: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  alt?: string;

  @ApiProperty()
  tags!: string[];

  @ApiProperty()
  uploadedBy!: string;

  @ApiPropertyOptional()
  uploadedByName?: string;

  @ApiProperty()
  downloadCount!: number;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class FileStatsDto {
  @ApiProperty()
  totalFiles!: number;

  @ApiProperty()
  totalSize!: number;

  @ApiProperty()
  totalSizeFormatted!: string;

  @ApiProperty()
  filesByType!: Record<FileType, number>;

  @ApiProperty()
  filesByStatus!: Record<UploadStatus, number>;

  @ApiProperty()
  averageFileSize!: number;

  @ApiProperty()
  largestFile!: {
    id: string;
    filename: string;
    size: number;
  };

  @ApiProperty()
  mostDownloaded!: {
    id: string;
    filename: string;
    downloadCount: number;
  };

  @ApiProperty()
  recentUploads!: number;

  @ApiProperty()
  storageUsage!: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export class BulkDeleteDto {
  @ApiProperty({ description: 'Array of file IDs to delete' })
  @IsArray()
  @IsString({ each: true })
  fileIds!: string[];

  @ApiPropertyOptional({ description: 'Reason for deletion' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Also delete from Cloudinary', default: true })
  @IsOptional()
  @IsBoolean()
  deleteFromCloudinary?: boolean;
}
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileUploadDocument = FileUpload & Document;

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

@Schema({
  timestamps: true,
  collection: 'file_uploads',
})
export class FileUpload {
  _id: Types.ObjectId;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, enum: FileType })
  type: FileType;

  @Prop({ required: true, enum: UploadStatus, default: UploadStatus.UPLOADING })
  status: UploadStatus;

  // Cloudinary information
  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({ required: true })
  cloudinaryUrl: string;

  @Prop()
  cloudinarySecureUrl?: string;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  format?: string;

  @Prop()
  bytes?: number;

  @Prop()
  resourceType?: string;

  // File metadata
  @Prop()
  alt?: string;

  @Prop()
  caption?: string;

  @Prop()
  description?: string;

  @Prop([String])
  tags?: string[];

  // Upload information
  @Prop({ required: true })
  uploadedBy: string; // User ID

  @Prop()
  uploadedByName?: string; // User name for quick reference

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  // Related content
  @Prop()
  relatedPostId?: string;

  @Prop()
  relatedCategoryId?: string;

  @Prop()
  relatedUserId?: string;

  // SEO and accessibility
  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop([String])
  keywords?: string[];

  // Processing information
  @Prop()
  processingStartedAt?: Date;

  @Prop()
  processingCompletedAt?: Date;

  @Prop()
  processingError?: string;

  @Prop()
  compressionRatio?: number;

  @Prop()
  originalFormat?: string;

  // Responsive URLs (for images)
  @Prop({ 
    type: Object,
    default: null 
  })
  responsiveUrls?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };

  // Usage tracking
  @Prop({ default: 0 })
  downloadCount?: number;

  @Prop({ default: 0 })
  viewCount?: number;

  @Prop()
  lastAccessedAt?: Date;

  // Soft delete
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletedBy?: string;

  @Prop()
  deletionReason?: string;

  // Version control
  @Prop({ default: 1 })
  version: number;

  @Prop()
  previousVersionId?: string;

  // Automatic timestamps from schema
  createdAt: Date;
  updatedAt: Date;
}

export const FileUploadSchema = SchemaFactory.createForClass(FileUpload);

// Indexes for better performance
FileUploadSchema.index({ uploadedBy: 1 });
FileUploadSchema.index({ type: 1 });
FileUploadSchema.index({ status: 1 });
FileUploadSchema.index({ cloudinaryPublicId: 1 });
FileUploadSchema.index({ relatedPostId: 1 });
FileUploadSchema.index({ createdAt: -1 });
FileUploadSchema.index({ isDeleted: 1 });

// Compound indexes
FileUploadSchema.index({ uploadedBy: 1, type: 1 });
FileUploadSchema.index({ status: 1, createdAt: -1 });
FileUploadSchema.index({ isDeleted: 1, createdAt: -1 });
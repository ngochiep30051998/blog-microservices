import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsUUID, IsInt, IsUrl, ValidateNested, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum ContentType {
  MARKDOWN = 'markdown',
  HTML = 'html',
  RICH_TEXT = 'rich_text',
}

class OpenGraphDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

class TwitterCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  site?: string;
}

class GalleryImageDto {
  @ApiProperty()
  @IsString()
  @IsUrl()
  url!: string;

  @ApiProperty()
  @IsString()
  alt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  height?: number;
}

export class CreatePostDto {
  @ApiProperty({ description: 'Post title', example: 'Getting Started with NestJS' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Post description/summary', example: 'A comprehensive guide to building applications with NestJS' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ description: 'Post content', example: '# Introduction\n\nNestJS is a powerful framework...' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ enum: ContentType, default: ContentType.MARKDOWN })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Short excerpt of the post', example: 'Learn how to build scalable applications with NestJS' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.DRAFT })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Array of tags', example: ['nestjs', 'typescript', 'tutorial'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'SEO keywords', example: ['nestjs tutorial', 'typescript guide'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Featured image URL for social sharing' })
  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;

  @ApiPropertyOptional({ description: 'Gallery images', type: [GalleryImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryImageDto)
  galleryImages?: GalleryImageDto[];

  @ApiPropertyOptional({ description: 'SEO meta title', example: 'NestJS Tutorial - Complete Guide' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Open Graph metadata', type: OpenGraphDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenGraphDto)
  openGraph?: OpenGraphDto;

  @ApiPropertyOptional({ description: 'Twitter Card metadata', type: TwitterCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwitterCardDto)
  twitterCard?: TwitterCardDto;

  @ApiPropertyOptional({ description: 'Mark as featured post', default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Publication date (for scheduled posts)' })
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Language code', example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;

  @ApiPropertyOptional({ type: [GalleryImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryImageDto)
  galleryImages?: GalleryImageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiPropertyOptional({ type: OpenGraphDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenGraphDto)
  openGraph?: OpenGraphDto;

  @ApiPropertyOptional({ type: TwitterCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwitterCardDto)
  twitterCard?: TwitterCardDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ContentType })
  contentType: ContentType;

  @ApiProperty()
  excerpt: string;

  @ApiProperty({ enum: PostStatus })
  status: PostStatus;

  @ApiProperty()
  featured: boolean;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorName: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
  };

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  keywords: string[];

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  featuredImageUrl?: string;

  @ApiPropertyOptional({ type: [GalleryImageDto] })
  galleryImages?: GalleryImageDto[];

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiPropertyOptional()
  canonicalUrl?: string;

  @ApiPropertyOptional()
  openGraph?: OpenGraphDto;

  @ApiPropertyOptional()
  twitterCard?: TwitterCardDto;

  @ApiProperty()
  wordCount: number;

  @ApiProperty()
  readingTime: number;

  @ApiPropertyOptional()
  headings?: {
    level: number;
    text: string;
    id: string;
  }[];

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  shareCount: number;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiPropertyOptional()
  scheduledAt?: Date;

  @ApiProperty()
  version: number;

  @ApiPropertyOptional()
  lastEditedAt?: Date;

  @ApiPropertyOptional()
  lastEditedBy?: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PostListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  excerpt: string;

  @ApiProperty({ enum: PostStatus })
  status: PostStatus;

  @ApiProperty()
  featured: boolean;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorName: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
  };

  @ApiProperty()
  tags: string[];

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  wordCount: number;

  @ApiProperty()
  readingTime: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
/**
 * Integration interfaces for upload service
 */

export interface UploadIntegration {
  // For integration with other services
  uploadedBy: {
    id: string;
    name?: string;
    email?: string;
  };
  
  // Service integration
  relatedService?: 'post-service' | 'user-service' | 'comment-service';
  relatedEntityId?: string;
  relatedEntityType?: 'post' | 'user' | 'category' | 'comment';
  
  // Metadata for other services
  context?: {
    action: 'create' | 'update' | 'gallery' | 'profile' | 'content';
    source: 'web' | 'mobile' | 'api';
    sessionId?: string;
  };
}

export interface FileProcessingOptions {
  // Processing preferences
  autoOptimize?: boolean;
  generateResponsiveVersions?: boolean;
  createThumbnails?: boolean;
  
  // Quality settings
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'auto' | 'webp' | 'jpeg' | 'png';
  
  // Transformation options
  maxWidth?: number;
  maxHeight?: number;
  cropMode?: 'fill' | 'fit' | 'limit' | 'scale';
  gravity?: 'center' | 'face' | 'faces' | 'auto';
}

export interface PostServiceIntegration {
  // For post service integration
  postId?: string;
  categoryId?: string;
  
  // Content type specific
  isMainImage?: boolean;
  isThumbnail?: boolean;
  isGalleryItem?: boolean;
  isContentImage?: boolean;
  
  // SEO and accessibility
  altText?: string;
  caption?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
  gravity?: string;
  effect?: string;
  flags?: string;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  urls?: {
    original: string;
    optimized: string;
    thumbnail?: string;
    responsive?: {
      small: string;
      medium: string;
      large: string;
    };
  };
  metadata?: {
    width?: number;
    height?: number;
    format: string;
    size: number;
    bytes: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
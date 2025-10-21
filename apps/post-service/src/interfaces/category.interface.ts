export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  coverImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  coverImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  categoriesWithPosts: number;
  categoriesWithoutPosts: number;
  averagePostsPerCategory: number;
  topCategories: {
    id: string;
    name: string;
    postCount: number;
    totalViews: number;
  }[];
  levelDistribution: {
    level: number;
    count: number;
  }[];
}
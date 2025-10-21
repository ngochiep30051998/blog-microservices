import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Category } from '../entities/category.entity';

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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  /**
   * Create a new category
   */
  async create(data: CreateCategoryData): Promise<Category> {
    // Check for duplicate name
    const existingByName = await this.categoryRepository.findOne({
      where: { name: data.name }
    });
    if (existingByName) {
      throw new ConflictException('Category with this name already exists');
    }

    // Generate slug
    const slug = this.generateSlug(data.name);
    const existingBySlug = await this.categoryRepository.findOne({
      where: { slug }
    });
    if (existingBySlug) {
      throw new ConflictException('Category slug already exists');
    }

    // Validate parent category if provided
    let parentCategory: Category | null = null;
    let level = 0;

    if (data.parentId) {
      parentCategory = await this.categoryRepository.findOne({
        where: { id: data.parentId }
      });
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
      
      // Check hierarchy depth (max 3 levels: 0, 1, 2)
      if (parentCategory.level >= 2) {
        throw new BadRequestException('Maximum category depth (3 levels) exceeded');
      }
      
      level = parentCategory.level + 1;
    }

    // Create category
    const category = this.categoryRepository.create({
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId,
      level,
      color: data.color,
      icon: data.icon,
      coverImageUrl: data.coverImageUrl,
      metaTitle: data.metaTitle || data.name,
      metaDescription: data.metaDescription || data.description,
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive !== false,
      postCount: 0,
      totalViews: 0,
    });

    return await this.categoryRepository.save(category);
  }

  /**
   * Get all categories with hierarchy
   * Returns only root categories with their children loaded
   * to avoid duplicates in the result array
   * Uses single query and builds tree in memory for optimal performance
   */
  async findAll(): Promise<Category[]> {
    // Single query to get ALL categories at once
    const allCategories = await this.categoryRepository.find({
      order: {
        level: 'ASC',
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });

    // Build tree structure in memory
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map and initialize children arrays
    allCategories.forEach(category => {
      category.children = []; // Initialize empty children array
      categoryMap.set(category.id, category);
    });

    // Second pass: build parent-child relationships
    allCategories.forEach(category => {
      if (!category.parentId) {
        // Root category
        rootCategories.push(category);
      } else {
        // Child category - add to parent's children array
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(category);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Get category hierarchy as tree structure
   */
  async findHierarchy(): Promise<any[]> {
    // Get all root categories (level 0)
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: IsNull() },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Build tree structure recursively
    const buildTree = async (categories: Category[]): Promise<any[]> => {
      const tree = [];
      
      for (const category of categories) {
        const children = await this.categoryRepository.find({
          where: { parentId: category.id },
          order: { sortOrder: 'ASC', name: 'ASC' },
        });
        
        tree.push({
          ...category,
          children: children.length > 0 ? await buildTree(children) : [],
        });
      }
      
      return tree;
    };

    return await buildTree(rootCategories);
  }

  /**
   * Find category by ID
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Update category
   */
  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const category = await this.findOne(id);

    // Check for duplicate name (excluding current)
    if (data.name && data.name !== category.name) {
      const existingByName = await this.categoryRepository.findOne({
        where: { name: data.name, id: Not(id) }
      });
      if (existingByName) {
        throw new ConflictException('Category with this name already exists');
      }
      
      // Update slug
      const newSlug = this.generateSlug(data.name);
      const existingBySlug = await this.categoryRepository.findOne({
        where: { slug: newSlug, id: Not(id) }
      });
      if (existingBySlug) {
        throw new ConflictException('Category slug already exists');
      }
      category.slug = newSlug;
    }

    // Handle parent change
    if (data.parentId !== undefined) {
      if (data.parentId === null) {
        // Moving to root
        category.parentId = null;
        category.level = 0;
      } else if (data.parentId !== category.parentId) {
        // Changing parent
        const newParent = await this.categoryRepository.findOne({
          where: { id: data.parentId }
        });
        if (!newParent) {
          throw new NotFoundException('Parent category not found');
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(id, data.parentId)) {
          throw new BadRequestException('Cannot set parent: would create circular reference');
        }

        // Check depth limit
        if (newParent.level >= 2) {
          throw new BadRequestException('Maximum category depth (3 levels) exceeded');
        }

        category.parentId = data.parentId;
        category.level = newParent.level + 1;

        // Update all children levels recursively
        await this.updateChildrenLevels(id, category.level);
      }
    }

    // Update other fields
    Object.assign(category, {
      name: data.name || category.name,
      description: data.description !== undefined ? data.description : category.description,
      color: data.color !== undefined ? data.color : category.color,
      icon: data.icon !== undefined ? data.icon : category.icon,
      coverImageUrl: data.coverImageUrl !== undefined ? data.coverImageUrl : category.coverImageUrl,
      metaTitle: data.metaTitle !== undefined ? data.metaTitle : category.metaTitle,
      metaDescription: data.metaDescription !== undefined ? data.metaDescription : category.metaDescription,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : category.sortOrder,
      isActive: data.isActive !== undefined ? data.isActive : category.isActive,
    });

    return await this.categoryRepository.save(category);
  }

  /**
   * Delete category
   */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has posts
    if (category.postCount > 0) {
      throw new BadRequestException('Cannot delete category with posts');
    }

    // Check if category has children
    const children = await this.categoryRepository.find({
      where: { parentId: id }
    });
    if (children.length > 0) {
      throw new BadRequestException('Cannot delete category with subcategories');
    }

    await this.categoryRepository.softDelete(id);
  }

  /**
   * Update post count for category
   */
  async updatePostCount(categoryId: string, increment: number = 1): Promise<void> {
    await this.categoryRepository.increment(
      { id: categoryId },
      'postCount',
      increment
    );
  }

  /**
   * Update total views for category
   */
  async updateTotalViews(categoryId: string, increment: number = 1): Promise<void> {
    await this.categoryRepository.increment(
      { id: categoryId },
      'totalViews',
      increment
    );
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<CategoryStats> {
    const totalCategories = await this.categoryRepository.count();
    const activeCategories = await this.categoryRepository.count({
      where: { isActive: true }
    });
    const inactiveCategories = totalCategories - activeCategories;
    
    const categoriesWithPosts = await this.categoryRepository.count({
      where: { postCount: Not(0) }
    });
    const categoriesWithoutPosts = totalCategories - categoriesWithPosts;

    const avgResult = await this.categoryRepository.query(
      'SELECT AVG(post_count) as average FROM categories WHERE deleted_at IS NULL'
    );
    const averagePostsPerCategory = parseFloat(avgResult[0]?.average || 0);

    // Get top categories by post count and views
    const topCategories = await this.categoryRepository.find({
      where: { postCount: Not(0) },
      order: { postCount: 'DESC', totalViews: 'DESC' },
      take: 10,
      select: ['id', 'name', 'postCount', 'totalViews'],
    });

    // Get level distribution
    const levelDistribution = await this.categoryRepository.query(`
      SELECT level, COUNT(*) as count 
      FROM categories 
      WHERE deleted_at IS NULL 
      GROUP BY level 
      ORDER BY level
    `);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      categoriesWithPosts,
      categoriesWithoutPosts,
      averagePostsPerCategory,
      topCategories,
      levelDistribution,
    };
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Check if setting parentId would create circular reference
   */
  private async wouldCreateCircularReference(categoryId: string, parentId: string): Promise<boolean> {
    let currentParent = parentId;
    const visited = new Set<string>();

    while (currentParent && !visited.has(currentParent)) {
      if (currentParent === categoryId) {
        return true;
      }
      
      visited.add(currentParent);
      
      const parent = await this.categoryRepository.findOne({
        where: { id: currentParent },
        select: ['parentId'],
      });
      
      currentParent = parent?.parentId || null;
    }

    return false;
  }

  /**
   * Update levels for all children recursively
   */
  private async updateChildrenLevels(parentId: string, parentLevel: number): Promise<void> {
    const children = await this.categoryRepository.find({
      where: { parentId },
      select: ['id', 'level'],
    });

    for (const child of children) {
      const newLevel = parentLevel + 1;
      if (newLevel <= 2) { // Max 3 levels (0, 1, 2)
        await this.categoryRepository.update(child.id, { level: newLevel });
        await this.updateChildrenLevels(child.id, newLevel);
      }
    }
  }
}
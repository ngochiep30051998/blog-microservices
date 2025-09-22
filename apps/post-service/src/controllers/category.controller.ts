import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard, Roles, RolesGuard, UserRole } from '@blog/shared/auth';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  SuccessResponseDto,
  ResponseBuilder,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
} from '@blog/shared/dto';

// Local imports
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create new category',
    description: `
Create a new post category with hierarchical support.

**Features:**
- Automatic slug generation from name
- Hierarchical categories (max 3 levels)
- SEO metadata support
- Color and icon customization
- Sort ordering

**Permissions:**
- Admin and Editor roles only
    `
  })
  @ApiCreatedResponse(CategoryResponseDto, 'Category created successfully')
  async create(
    @Body() createCategoryDto: CreateCategoryDto
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.create(createCategoryDto);
    
    return ResponseBuilder.created(category, 'Category created successfully', {
      level: category.level,
      hasParent: !!category.parentId,
    });
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: `
Retrieve all categories with hierarchical structure.

**Features:**
- Hierarchical ordering (parent → child)
- Post count for each category
- Active/inactive filtering
- Sort by custom order and name

**Use Cases:**
- Category dropdown/select lists
- Navigation menus
- Blog sidebar
    `
  })
  @ApiSuccessResponse(CategoryResponseDto, 'Categories retrieved successfully', 200)
  async findAll(): Promise<SuccessResponseDto<CategoryResponseDto[]>> {
    const categories = await this.categoryService.findAll();
    
    return ResponseBuilder.success(
      categories,
      'Categories retrieved successfully',
      HttpStatus.OK,
      { totalCount: categories.length }
    );
  }

  @Get('hierarchy')
  @ApiOperation({ 
    summary: 'Get category hierarchy',
    description: 'Get categories structured as a tree with parent-child relationships'
  })
  @ApiSuccessResponse(Object, 'Category hierarchy retrieved successfully')
  async getHierarchy(): Promise<SuccessResponseDto<any>> {
    const hierarchy = await this.categoryService.findHierarchy();
    
    return ResponseBuilder.success(
      hierarchy,
      'Category hierarchy retrieved successfully',
      HttpStatus.OK,
      { structure: 'tree' }
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get category statistics',
    description: 'Get comprehensive category statistics for admin dashboard'
  })
  @ApiSuccessResponse(Object, 'Category statistics retrieved successfully')
  async getStats(): Promise<SuccessResponseDto<any>> {
    const stats = await this.categoryService.getCategoryStats();
    
    return ResponseBuilder.success(
      stats,
      'Category statistics retrieved successfully'
    );
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: 'Retrieve a specific category with post count'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.findOne(id);
    
    return ResponseBuilder.success(category, 'Category retrieved successfully');
  }

  @Get('slug/:slug')
  @ApiOperation({ 
    summary: 'Get category by slug',
    description: 'Get category by slug for public category pages'
  })
  @ApiParam({ name: 'slug', type: 'string', description: 'Category slug' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findBySlug(@Param('slug') slug: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.findBySlug(slug);
    
    return ResponseBuilder.success(category, 'Category retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update category',
    description: 'Update category information including hierarchy changes'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiUpdatedResponse(CategoryResponseDto, 'Category updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    const category = await this.categoryService.update(id, updateCategoryDto);
    
    return ResponseBuilder.updated(category, 'Category updated successfully', {
      hierarchyChanged: updateCategoryDto.parentId !== undefined,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete category',
    description: `
Delete a category. Category must be empty (no posts or subcategories).

**Restrictions:**
- Cannot delete category with posts
- Cannot delete category with subcategories
- Admin role required
    `
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiDeletedResponse('Category deleted successfully')
  async remove(@Param('id') id: string): Promise<SuccessResponseDto<null>> {
    await this.categoryService.remove(id);
    
    return ResponseBuilder.deleted('Category deleted successfully', {
      cascadeChecked: true,
    });
  }
}
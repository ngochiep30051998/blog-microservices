import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Shared imports
import { JwtAuthGuard } from '@blog/shared/auth';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  SuccessResponseDto,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiUpdatedResponse,
  ApiDeletedResponse,
} from '@blog/shared/dto';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Categories (Proxy)')
@Controller('categories')
export class CategoryProxyController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new category' })
  @ApiCreatedResponse(CategoryResponseDto, 'Category created successfully')
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/categories',
      'POST',
      createCategoryDto,
      { authorization: auth }
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiSuccessResponse(CategoryResponseDto, 'Categories retrieved successfully', 200)
  async findAll(): Promise<SuccessResponseDto<CategoryResponseDto[]>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/categories',
      'GET'
    );
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiSuccessResponse(Object, 'Category hierarchy retrieved successfully')
  async getHierarchy(): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/categories/hierarchy',
      'GET'
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiSuccessResponse(Object, 'Category statistics retrieved successfully')
  async getStats(
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<any>> {
    return this.proxyService.proxyRequest(
      'post',
      '/posts/categories/stats',
      'GET',
      null,
      { authorization: auth }
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/categories/${id}`,
      'GET'
    );
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Category slug' })
  @ApiSuccessResponse(CategoryResponseDto, 'Category retrieved successfully')
  async findBySlug(@Param('slug') slug: string): Promise<SuccessResponseDto<CategoryResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/categories/slug/${slug}`,
      'GET'
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiUpdatedResponse(CategoryResponseDto, 'Category updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<CategoryResponseDto>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/categories/${id}`,
      'PATCH',
      updateCategoryDto,
      { authorization: auth }
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiDeletedResponse('Category deleted successfully')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ): Promise<SuccessResponseDto<null>> {
    return this.proxyService.proxyRequest(
      'post',
      `/posts/categories/${id}`,
      'DELETE',
      null,
      { authorization: auth }
    );
  }
}
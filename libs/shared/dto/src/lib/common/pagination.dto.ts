import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ 
    default: 1,
    minimum: 1,
    description: 'Page number' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiPropertyOptional({ description: 'Array of items' })
  items?: T[];

  @ApiPropertyOptional({ description: 'Total number of items' })
  total?: number;

  @ApiPropertyOptional({ description: 'Current page number' })
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Total number of pages' })
  totalPages?: number;

  @ApiPropertyOptional({ description: 'Whether there is a next page' })
  hasNext?: boolean;

  @ApiPropertyOptional({ description: 'Whether there is a previous page' })
  hasPrevious?: boolean;
}
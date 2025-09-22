import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from './success-response.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class PaginatedDataDto<T> {
  @ApiProperty({ description: 'Array of items' })
  items!: T[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false
    }
  })
  pagination!: PaginationMeta;
}

export class PaginatedResponseDto<T> extends SuccessResponseDto<PaginatedDataDto<T>> {
  constructor(
    items: T[],
    pagination: PaginationMeta,
    message: string = 'Data retrieved successfully',
    statusCode: number = 200
  ) {
    super(statusCode, message, { items, pagination });
  }
}
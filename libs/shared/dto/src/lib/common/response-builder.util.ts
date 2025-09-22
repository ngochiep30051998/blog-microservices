import { HttpStatus } from '@nestjs/common';
import { SuccessResponseDto } from './success-response.dto';
import { PaginatedResponseDto, PaginationMeta } from './paginated-response.dto';

export class ResponseBuilder {
  /**
   * Create success response with data
   */
  static success<T>(
    data: T,
    message: string = 'Operation completed successfully',
    statusCode: number = HttpStatus.OK,
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(statusCode, message, data, meta);
  }

  /**
   * Create success response without data
   */
  static successMessage(
    message: string = 'Operation completed successfully',
    statusCode: number = HttpStatus.OK,
    meta?: any
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(statusCode, message, null, meta);
  }

  /**
   * Create created response
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.CREATED, message, data, meta);
  }

  /**
   * Create updated response
   */
  static updated<T>(
    data: T,
    message: string = 'Resource updated successfully',
    meta?: any
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, meta);
  }

  /**
   * Create deleted response
   */
  static deleted(
    message: string = 'Resource deleted successfully',
    meta?: any
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(HttpStatus.OK, message, null, meta);
  }

  /**
   * Create paginated response
   */
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Data retrieved successfully'
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return new PaginatedResponseDto(items, pagination, message);
  }

  /**
   * Create login success response
   */
  static loginSuccess<T>(
    data: T,
    message: string = 'Login successful'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      loginAt: new Date().toISOString(),
    });
  }

  /**
   * Create logout success response
   */
  static logoutSuccess(
    message: string = 'Logout successful'
  ): SuccessResponseDto<null> {
    return new SuccessResponseDto(HttpStatus.OK, message, null, {
      logoutAt: new Date().toISOString(),
    });
  }

  /**
   * Create validation success response
   */
  static validationSuccess<T>(
    data: T,
    message: string = 'Validation successful'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      validatedAt: new Date().toISOString(),
    });
  }

  /**
   * Create health check response
   */
  static healthCheck(
    data: any,
    message: string = 'Service is healthy'
  ): SuccessResponseDto<any> {
    return new SuccessResponseDto(HttpStatus.OK, message, data, {
      checkedAt: new Date().toISOString(),
    });
  }

  /**
   * Create upload success response
   */
  static uploadSuccess<T>(
    data: T,
    message: string = 'File uploaded successfully'
  ): SuccessResponseDto<T> {
    return new SuccessResponseDto(HttpStatus.CREATED, message, data, {
      uploadedAt: new Date().toISOString(),
    });
  }
}
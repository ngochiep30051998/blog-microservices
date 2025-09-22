import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { SuccessResponseDto } from './success-response.dto';
import { PaginatedResponseDto } from './paginated-response.dto';

/**
 * Swagger decorator for success response with data
 */
export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Successful operation',
  statusCode: number = 200
) =>
  ApiResponse({
    status: statusCode,
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(model) },
            success: { type: 'boolean', example: true },
            statusCode: { type: 'number', example: statusCode },
            message: { type: 'string', example: description },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                requestId: { type: 'string', example: 'req_123456789' },
              },
            },
          },
        },
      ],
    },
  });

/**
 * Swagger decorator for success response without data
 */
export const ApiSuccessMessageResponse = (
  description: string = 'Successful operation',
  statusCode: number = 200
) =>
  ApiResponse({
    status: statusCode,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: description },
        data: { type: 'null', example: null },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
      },
    },
  });

/**
 * Swagger decorator for paginated response
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Paginated data retrieved successfully'
) =>
  ApiResponse({
    status: 200,
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponseDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: getSchemaPath(model) },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number', example: 1 },
                    limit: { type: 'number', example: 10 },
                    total: { type: 'number', example: 100 },
                    totalPages: { type: 'number', example: 10 },
                    hasNext: { type: 'boolean', example: true },
                    hasPrevious: { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
        },
      ],
    },
  });

/**
 * Swagger decorator for created response
 */
export const ApiCreatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Resource created successfully'
) => ApiSuccessResponse(model, description, 201);

/**
 * Swagger decorator for updated response
 */
export const ApiUpdatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Resource updated successfully'
) => ApiSuccessResponse(model, description, 200);

/**
 * Swagger decorator for deleted response
 */
export const ApiDeletedResponse = (
  description: string = 'Resource deleted successfully'
) => ApiSuccessMessageResponse(description, 200);
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';

export const ApiAuthenticatedOperation = (summary: string, description?: string) =>
  applyDecorators(
    ApiOperation({ summary, description }),
    ApiBearerAuth('JWT-auth'),
  );

export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) =>
  ApiResponse({
    status: 200,
    description: 'Paginated response',
    schema: {
      allOf: [
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(model) },
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrevious: { type: 'boolean', example: false },
          },
        },
      ],
    },
  });

export const ApiCreatedResponse = <TModel extends Type<any>>(model: TModel, description = 'Created successfully') =>
  ApiResponse({
    status: 201,
    description,
    type: model,
  });

export const ApiOkResponse = <TModel extends Type<any>>(model: TModel, description = 'Success') =>
  ApiResponse({
    status: 200,
    description,
    type: model,
  });

export const ApiValidationErrorResponse = () =>
  ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['email must be a valid email', 'password must be at least 8 characters'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  });

export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Access denied - Invalid or missing token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  });

export const ApiForbiddenResponse = () =>
  ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied - Required roles: admin' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  });

export const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'Resource not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  });

export const ApiConflictResponse = () =>
  ApiResponse({
    status: 409,
    description: 'Conflict - Resource already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email already exists' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  });

export const ApiInternalServerErrorResponse = () =>
  ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  });

// Composite decorators for common patterns
export const ApiStandardResponses = () =>
  applyDecorators(
    ApiValidationErrorResponse(),
    ApiUnauthorizedResponse(),
    ApiInternalServerErrorResponse(),
  );

export const ApiCrudResponses = <TModel extends Type<any>>(model: TModel) =>
  applyDecorators(
    ApiOkResponse(model),
    ApiValidationErrorResponse(),
    ApiUnauthorizedResponse(),
    ApiNotFoundResponse(),
    ApiInternalServerErrorResponse(),
  );

export const ApiAuthenticatedCrudOperation = <TModel extends Type<any>>(
  summary: string,
  model: TModel,
  description?: string,
) =>
  applyDecorators(
    ApiAuthenticatedOperation(summary, description),
    ApiCrudResponses(model),
  );
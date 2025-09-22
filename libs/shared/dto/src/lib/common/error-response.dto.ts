import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ 
    description: 'Indicates if the request was successful',
    example: false,
    default: false
  })
  success: boolean;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Error message',
    example: 'Validation failed'
  })
  message: string;

  @ApiProperty({ 
    description: 'Error details',
    example: {
      field: 'email',
      errors: ['Email is required', 'Email must be valid']
    }
  })
  error?: any;

  @ApiProperty({ 
    description: 'Additional metadata',
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/api/v1/users/register'
    }
  })
  meta: {
    timestamp: string;
    path?: string;
    requestId?: string;
    [key: string]: any;
  };

  constructor(
    statusCode: number,
    message: string,
    error?: any,
    path?: string,
    requestId?: string
  ) {
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...(path && { path }),
      ...(requestId && { requestId }),
    };
  }
}
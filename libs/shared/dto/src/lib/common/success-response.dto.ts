import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto<T = any> {
  @ApiProperty({ 
    description: 'Indicates if the request was successful',
    example: true,
    default: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 200
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Success message',
    example: 'Operation completed successfully'
  })
  message: string;

  @ApiPropertyOptional({ 
    description: 'Response data',
    example: {} 
  })
  data?: T;

  @ApiPropertyOptional({ 
    description: 'Additional metadata',
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      requestId: 'req_123456789'
    }
  })
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    [key: string]: any;
  };

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    meta?: any
  ) {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }
}
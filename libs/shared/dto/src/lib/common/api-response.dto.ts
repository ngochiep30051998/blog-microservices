import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  timestamp: string;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

export class SuccessResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(message: string, data?: T) {
    super(true, message, data);
  }
}

export class ErrorResponseDto extends ApiResponseDto {
  @ApiProperty()
  error?: any;

  constructor(message: string, error?: any) {
    super(false, message);
    this.error = error;
  }
}
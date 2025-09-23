import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Basic health check endpoint to verify service is running'
  })
  getHealth(): {
    message: string;
    service: string;
    timestamp: string;
    version: string;
    environment: string;
  } {
    return this.appService.getHealth();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Detailed health check',
    description: 'Comprehensive health check with configuration details and system status'
  })
  getDetailedHealth(): {
    status: string;
    service: string;
    version: string;
    timestamp: string;
    uptime: number;
    environment: string;
    config: {
      mongodb: {
        uri: string;
        connected: boolean;
      };
      cloudinary: {
        cloudName: string;
        configured: boolean;
      };
      limits: {
        maxFileSize: string;
        maxFilesPerUpload: number;
        uploadRateLimit: number;
      };
    };
  } {
    return this.appService.getDetailedHealth();
  }
}
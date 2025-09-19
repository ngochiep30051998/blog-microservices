import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly proxyService: MicroserviceProxyService) {}

  @Get()
  @ApiOperation({ summary: 'API Gateway health check' })
  @ApiResponse({ 
    status: 200, 
    description: 'API Gateway is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        service: { type: 'string', example: 'api-gateway' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '1.0.0' },
      }
    }
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      memory: process.memoryUsage(),
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Check all microservices health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Services health status',
    schema: {
      type: 'object',
      properties: {
        status: { 
          type: 'string', 
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy' 
        },
        services: { 
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              name: { type: 'string' },
              url: { type: 'string' },
              responseTime: { type: 'string' },
              lastChecked: { type: 'string' },
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            healthy: { type: 'number' },
            unhealthy: { type: 'number' },
          }
        },
        timestamp: { type: 'string' }
      }
    }
  })
  async servicesHealth() {
    return this.proxyService.healthCheck();
  }

  @Get('services/list')
  @ApiOperation({ summary: 'List all registered services' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of registered microservices' 
  })
  listServices() {
    return {
      services: this.proxyService.getAvailableServices(),
      total: this.proxyService.getAvailableServices().length,
      timestamp: new Date().toISOString(),
    };
  }
}
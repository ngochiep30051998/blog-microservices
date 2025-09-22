import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, TimeoutError } from 'rxjs';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
}

export interface ProxyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

@Injectable()
export class MicroserviceProxyService {
  private readonly logger = new Logger(MicroserviceProxyService.name);
  private readonly services: Map<string, ServiceConfig>;
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly defaultRetries = 3;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.services = new Map([
      ['user', {
        name: 'User Service',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:9001'),
        timeout: this.configService.get('USER_SERVICE_TIMEOUT', this.defaultTimeout),
        retries: this.defaultRetries,
      }],
      ['post', {
        name: 'Post Service',
        url: this.configService.get('POST_SERVICE_URL', 'http://localhost:9002'),
        timeout: this.configService.get('POST_SERVICE_TIMEOUT', this.defaultTimeout),
        retries: this.defaultRetries,
      }],
      ['comment', {
        name: 'Comment Service',
        url: this.configService.get('COMMENT_SERVICE_URL', 'http://localhost:3003'),
        timeout: this.configService.get('COMMENT_SERVICE_TIMEOUT', this.defaultTimeout),
        retries: this.defaultRetries,
      }],
      ['notification', {
        name: 'Notification Service',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3004'),
        timeout: this.configService.get('NOTIFICATION_SERVICE_TIMEOUT', this.defaultTimeout),
        retries: this.defaultRetries,
      }],
      ['analytics', {
        name: 'Analytics Service',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:3005'),
        timeout: this.configService.get('ANALYTICS_SERVICE_TIMEOUT', this.defaultTimeout),
        retries: this.defaultRetries,
      }],
    ]);

    this.logger.log('Microservice Proxy Service initialized');
    this.logServiceConfigs();
  }

  /**
   * Proxy request to a microservice
   */
  async proxyRequest(
    serviceName: string,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any,
    headers?: Record<string, string>,
    params?: Record<string, any>,
  ): Promise<any> {
    const options: ProxyRequestOptions = {
      method,
      data,
      headers,
      params,
    };
    return this.makeRequest(serviceName, path, options);
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    serviceName: string,
    path: string,
    options: ProxyRequestOptions,
  ): Promise<any> {
    const serviceConfig = this.services.get(serviceName);
    
    if (!serviceConfig) {
      throw new HttpException(
        `Service '${serviceName}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${serviceConfig.url}${path}`;
    const requestConfig = this.buildRequestConfig(url, serviceConfig, options);
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= serviceConfig.retries; attempt++) {
      try {
        this.logger.debug(`[Attempt ${attempt}/${serviceConfig.retries}] ${options.method} ${url}`);
        
        const response = await this.executeRequest(requestConfig, serviceConfig.timeout);
        
        this.logger.log(`✅ ${options.method} ${url} - ${response.status}`);
        return response.data;

      } catch (error) {
        lastError = error;
        this.logger.warn(
          `❌ [Attempt ${attempt}/${serviceConfig.retries}] ${options.method} ${url} - ${error.message}`
        );

        // Don't retry for client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < serviceConfig.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    return this.handleRequestError(serviceName, serviceConfig, lastError);
  }

  /**
   * Build Axios request configuration
   */
  private buildRequestConfig(
    url: string,
    serviceConfig: ServiceConfig,
    options: ProxyRequestOptions,
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: options.method?.toLowerCase() as any,
      url,
      timeout: options.timeout || serviceConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': this.generateRequestId(),
        'X-Forwarded-By': 'api-gateway',
        ...options.headers,
      },
      // Enable automatic request/response interceptors
      validateStatus: (status) => status < 500, // Don't throw for < 500
    };

    if (options.data && ['POST', 'PUT', 'PATCH'].includes(options.method || '')) {
      config.data = options.data;
    }

    if (options.params) {
      config.params = options.params;
    }

    return config;
  }

  /**
   * Execute HTTP request with timeout
   */
  private async executeRequest(
    config: AxiosRequestConfig,
    timeoutMs: number,
  ): Promise<AxiosResponse> {
    return firstValueFrom(
      this.httpService.request(config).pipe(
        timeout({ each: timeoutMs }),
        catchError((error) => {
          throw error;
        })
      )
    );
  }

  /**
   * Handle request errors and throw appropriate HTTP exceptions
   */
  private handleRequestError(
    serviceName: string,
    serviceConfig: ServiceConfig,
    error: any,
  ): never {
    const serviceName_ = serviceConfig.name;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      this.logger.error(
        `${serviceName_} responded with ${status}: ${JSON.stringify(data)}`
      );

      throw new HttpException(
        data || `${serviceName_} error`,
        status,
      );

    } else if (error.code === 'ECONNREFUSED') {
      // Connection refused - service is down
      this.logger.error(`${serviceName_} is unavailable (connection refused)`);
      
      throw new HttpException(
        {
          message: `${serviceName_} is currently unavailable`,
          service: serviceName,
          error: 'SERVICE_UNAVAILABLE'
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );

    } else if (error instanceof TimeoutError || error.name === 'TimeoutError' || error.code === 'ECONNABORTED') {
      // Request timeout
      this.logger.error(`${serviceName_} request timeout`);
      
      throw new HttpException(
        {
          message: `${serviceName_} request timeout`,
          service: serviceName,
          error: 'REQUEST_TIMEOUT'
        },
        HttpStatus.REQUEST_TIMEOUT,
      );

    } else {
      // Unknown error
      this.logger.error(`${serviceName_} unknown error:`, error);
      
      throw new HttpException(
        {
          message: `Internal server error while communicating with ${serviceName_}`,
          service: serviceName,
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check all services
   */
  async healthCheck(): Promise<Record<string, any>> {
    const healthChecks: Record<string, any> = {};

    const promises = Array.from(this.services.entries()).map(
      async ([serviceName, config]) => {
        try {
          const startTime = Date.now();
          
          const response = await this.proxyRequest(serviceName, '/health', 'GET');
          
          const responseTime = Date.now() - startTime;
          
          healthChecks[serviceName] = {
            status: 'healthy',
            name: config.name,
            url: config.url,
            responseTime: `${responseTime}ms`,
            response: response,
            lastChecked: new Date().toISOString(),
          };

        } catch (error) {
          healthChecks[serviceName] = {
            status: 'unhealthy',
            name: config.name,
            url: config.url,
            error: error.message,
            lastChecked: new Date().toISOString(),
          };
        }
      }
    );

    await Promise.all(promises);

    // Calculate overall status
    const healthyCount = Object.values(healthChecks).filter(
      (check: any) => check.status === 'healthy'
    ).length;
    
    const totalCount = Object.keys(healthChecks).length;
    
    let overallStatus: string;
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services: healthChecks,
      summary: {
        total: totalCount,
        healthy: healthyCount,
        unhealthy: totalCount - healthyCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get list of available services
   */
  getAvailableServices(): Array<{ name: string; config: ServiceConfig }> {
    return Array.from(this.services.entries()).map(([name, config]) => ({
      name,
      config,
    }));
  }

  /**
   * Get specific service configuration
   */
  getServiceConfig(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Update service configuration at runtime
   */
  updateServiceConfig(serviceName: string, updates: Partial<ServiceConfig>): boolean {
    const existing = this.services.get(serviceName);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...updates };
    this.services.set(serviceName, updated);
    
    this.logger.log(`Updated configuration for ${serviceName}:`, updated);
    return true;
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log service configurations on startup
   */
  private logServiceConfigs(): void {
    this.logger.log('📋 Registered microservices:');
    
    for (const [name, config] of this.services.entries()) {
      this.logger.log(`  • ${config.name}: ${config.url} (timeout: ${config.timeout}ms)`);
    }
  }

  /**
   * Proxy file upload to microservice
   */
  async proxyFileUpload(
    serviceName: string,
    path: string,
    file: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const url = `${serviceConfig.url}${path}`;
    
    try {
      const response = await this.httpService.axiosRef({
        method: 'POST',
        url,
        data: form,
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
        timeout: serviceConfig.timeout,
      });

      return response.data;
    } catch (error) {
      this.handleProxyError(error, serviceName, path);
    }
  }

  /**
   * Proxy multiple file uploads to microservice
   */
  async proxyMultipleFileUpload(
    serviceName: string,
    path: string,
    files: any[],
    headers: Record<string, string> = {}
  ): Promise<any> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const FormData = require('form-data');
    const form = new FormData();
    
    files.forEach(file => {
      form.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const url = `${serviceConfig.url}${path}`;
    
    try {
      const response = await this.httpService.axiosRef({
        method: 'POST',
        url,
        data: form,
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
        timeout: serviceConfig.timeout,
      });

      return response.data;
    } catch (error) {
      this.handleProxyError(error, serviceName, path);
    }
  }

  /**
   * Handle proxy errors consistently
   */
  private handleProxyError(error: any, serviceName: string, path: string): never {
    const serviceConfig = this.services.get(serviceName);
    const serviceName_ = serviceConfig?.name || serviceName;

    this.logger.error(`Error in ${serviceName_} (${path}):`, error.message);

    if (error.response) {
      // Server responded with error status
      throw new HttpException(
        error.response.data || `${serviceName_} error`,
        error.response.status,
      );
    } else if (error.code === 'ECONNREFUSED') {
      // Connection refused
      throw new HttpException(
        {
          message: `${serviceName_} is currently unavailable`,
          service: serviceName,
          error: 'SERVICE_UNAVAILABLE'
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      throw new HttpException(
        {
          message: `${serviceName_} request timeout`,
          service: serviceName,
          error: 'REQUEST_TIMEOUT'
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    } else {
      // Unknown error
      throw new HttpException(
        {
          message: `Internal server error while communicating with ${serviceName_}`,
          service: serviceName,
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

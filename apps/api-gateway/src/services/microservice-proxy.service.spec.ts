import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceProxyService } from './microservice-proxy.service';

describe('MicroserviceProxyService', () => {
  let service: MicroserviceProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MicroserviceProxyService],
    }).compile();

    service = module.get<MicroserviceProxyService>(MicroserviceProxyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

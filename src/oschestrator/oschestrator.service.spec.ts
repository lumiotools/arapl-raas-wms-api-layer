import { Test, TestingModule } from '@nestjs/testing';
import { OschestratorService } from './oschestrator.service';

describe('OschestratorService', () => {
  let service: OschestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OschestratorService],
    }).compile();

    service = module.get<OschestratorService>(OschestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OschestratorController } from './oschestrator.controller';
import { OschestratorService } from './oschestrator.service';

describe('OschestratorController', () => {
  let controller: OschestratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OschestratorController],
      providers: [OschestratorService],
    }).compile();

    controller = module.get<OschestratorController>(OschestratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RobotJobService } from './robot-job.service';

describe('RobotJobService', () => {
  let service: RobotJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RobotJobService],
    }).compile();

    service = module.get<RobotJobService>(RobotJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RobotJobController } from './robot-job.controller';
import { RobotJobService } from './robot-job.service';

describe('RobotJobController', () => {
  let controller: RobotJobController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RobotJobController],
      providers: [RobotJobService],
    }).compile();

    controller = module.get<RobotJobController>(RobotJobController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
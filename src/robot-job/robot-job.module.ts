import { Module } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { RobotJobController } from './robot-job.controller';

@Module({
  controllers: [RobotJobController],
  providers: [RobotJobService],
})
export class RobotJobModule {}

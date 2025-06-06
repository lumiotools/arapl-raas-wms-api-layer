import { Module } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { RobotJobController } from './robot-job.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity'; // Adjust the import path as necessary

@Module({
  imports: [TypeOrmModule.forFeature([BatchJob, Task])], // Add your entities here
  controllers: [RobotJobController],
  providers: [RobotJobService],
})
export class RobotJobModule {}

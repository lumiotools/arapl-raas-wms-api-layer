import { Module } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { RobotJobController } from './robot-job.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { OschestratorService } from 'src/oschestrator/oschestrator.service';
import { queueElementDto } from 'src/oschestrator/dto/queue.dto';
import { Location } from './entities/locations.entity'; // Adjust the import path as necessary

@Module({
  imports: [TypeOrmModule.forFeature([BatchJob, Task, queueElementDto, Location])],
  controllers: [RobotJobController],
  providers: [RobotJobService, OschestratorService],
  exports: [
    RobotJobService,
    TypeOrmModule, // Export TypeOrmModule to make repositories available
  ],
})
export class RobotJobModule {}

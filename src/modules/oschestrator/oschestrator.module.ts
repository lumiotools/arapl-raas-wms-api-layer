import { Module } from '@nestjs/common';
import { OschestratorService } from './oschestrator.service';
import { OschestratorController } from './oschestrator.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from '../robot-job/entities/batch_task.entity';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskGenerationReq } from '../robot-job/dto/Task_Generation.dto';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task, BatchJob, Warehouse, TaskGenerationReq]),
  ],
  controllers: [OschestratorController],
  providers: [OschestratorService],
})
export class OschestratorModule {}

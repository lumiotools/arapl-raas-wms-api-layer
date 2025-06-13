import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { RobotJobController } from './robot-job.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { OschestratorService } from 'src/modules/oschestrator/oschestrator.service';
import { queueElementDto } from 'src/modules/oschestrator/dto/queue.dto';
import { Location } from './entities/locations.entity';
import { AuthenticationMiddleware } from '../../middlewares/authentication.middleware';
import { VersionMiddleware } from '../../middlewares/version.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchJob, Task, queueElementDto, Location]),
  ],
  controllers: [RobotJobController],
  providers: [RobotJobService, OschestratorService],
  exports: [RobotJobService, TypeOrmModule],
})
export class RobotJobModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthenticationMiddleware, VersionMiddleware)
      .forRoutes(RobotJobController);
  }
}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RobotJobModule } from './robot-job/robot-job.module';

@Module({
  imports: [RobotJobModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

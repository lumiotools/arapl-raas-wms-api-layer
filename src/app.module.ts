import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RobotJobModule } from './robot-job/robot-job.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DBConfig }  from './config/db.config';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    TypeOrmModule.forRoot(DBConfig),
    RobotJobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

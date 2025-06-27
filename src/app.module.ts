import { Module } from '@nestjs/common';
import { RobotJobModule } from './modules/robot-job/robot-job.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OschestratorModule } from './modules/oschestrator/oschestrator.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ConfigMappingModule } from './modules/config-mapping/config-mapping.module';
import { getDBConfig } from './config/db.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDBConfig(configService),
      inject: [ConfigService],
    }),
    RobotJobModule,
    OschestratorModule,
    LocationsModule,
    ConfigMappingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

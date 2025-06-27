import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMappingController } from './config-mapping.controller';
import { ConfigMappingService } from './config-mapping.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  controllers: [ConfigMappingController],
  providers: [ConfigMappingService],
  exports: [ConfigMappingService],
})
export class ConfigMappingModule {}

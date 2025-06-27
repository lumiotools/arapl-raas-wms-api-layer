import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseConfigController } from './warehouse-config.controller';
import { WarehouseConfigService } from './warehouse-config.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  controllers: [WarehouseConfigController],
  providers: [WarehouseConfigService],
  exports: [WarehouseConfigService],
})
export class WarehouseConfigModule {}

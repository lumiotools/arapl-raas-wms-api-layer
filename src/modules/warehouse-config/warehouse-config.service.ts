import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  WarehouseConfigResponseDto,
} from './dto/warehouse-config.dto';

@Injectable()
export class WarehouseConfigService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async updateCreateTaskConfig(
    warehouseId: string,
    createTaskConfigDto: CreateTaskConfigDto,
  ): Promise<WarehouseConfigResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.create_task_config = createTaskConfigDto.config;
    const updatedWarehouse = await this.warehouseRepository.save(warehouse);

    return this.mapToResponseDto(updatedWarehouse);
  }

  async updateUpdateTaskConfig(
    warehouseId: string,
    updateTaskConfigDto: UpdateTaskConfigDto,
  ): Promise<WarehouseConfigResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.update_task_config = updateTaskConfigDto.config;
    const updatedWarehouse = await this.warehouseRepository.save(warehouse);

    return this.mapToResponseDto(updatedWarehouse);
  }

  async updateCancelTaskConfig(
    warehouseId: string,
    cancelTaskConfigDto: CancelTaskConfigDto,
  ): Promise<WarehouseConfigResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.cancel_task_config = cancelTaskConfigDto.config;
    const updatedWarehouse = await this.warehouseRepository.save(warehouse);

    return this.mapToResponseDto(updatedWarehouse);
  }

  async updateGetLocationConfig(
    warehouseId: string,
    getLocationConfigDto: GetLocationConfigDto,
  ): Promise<WarehouseConfigResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.get_location_config = getLocationConfigDto.config;
    const updatedWarehouse = await this.warehouseRepository.save(warehouse);

    return this.mapToResponseDto(updatedWarehouse);
  }

  async getWarehouseConfig(
    warehouseId: string,
  ): Promise<WarehouseConfigResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    return this.mapToResponseDto(warehouse);
  }

  private mapToResponseDto(warehouse: Warehouse): WarehouseConfigResponseDto {
    return {
      warehouse_id: warehouse.warehouse_id,
      warehouse_name: warehouse.warehouse_name,
      create_task_config: warehouse.create_task_config,
      update_task_config: warehouse.update_task_config,
      cancel_task_config: warehouse.cancel_task_config,
      get_location_config: warehouse.get_location_config,
    };
  }
}

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
  WarehouseConfigUpdateResponseDto,
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
  ): Promise<WarehouseConfigUpdateResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.create_task_config = createTaskConfigDto.config;
    await this.warehouseRepository.save(warehouse);

    return {
      success: true,
      message: 'Create task configuration updated successfully',
      sample_data: this.generateInputSampleDataFromConfig(
        createTaskConfigDto.config,
      ),
    };
  }

  async updateUpdateTaskConfig(
    warehouseId: string,
    updateTaskConfigDto: UpdateTaskConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.update_task_config = updateTaskConfigDto.config;
    await this.warehouseRepository.save(warehouse);

    return {
      success: true,
      message: 'Update task configuration updated successfully',
      sample_data: this.generateInputSampleDataFromConfig(
        updateTaskConfigDto.config,
      ),
    };
  }

  async updateCancelTaskConfig(
    warehouseId: string,
    cancelTaskConfigDto: CancelTaskConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.cancel_task_config = cancelTaskConfigDto.config;
    await this.warehouseRepository.save(warehouse);

    return {
      success: true,
      message: 'Cancel task configuration updated successfully',
      sample_data: this.generateInputSampleDataFromConfig(
        cancelTaskConfigDto.config,
      ),
    };
  }

  async updateGetLocationConfig(
    warehouseId: string,
    getLocationConfigDto: GetLocationConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    warehouse.get_location_config = getLocationConfigDto.config;
    await this.warehouseRepository.save(warehouse);

    return {
      success: true,
      message: 'Get location configuration updated successfully',
      sample_data: this.generateInputSampleDataFromConfig(
        getLocationConfigDto.config,
      ),
    };
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

  private generateArraySampleData(arrayConfig: any): any[] {
    if (!arrayConfig.map) {
      return [];
    }

    // Generate a sample array with one item based on the map configuration
    const sampleItem = this.generateObjectSampleData(arrayConfig.map);
    return [sampleItem];
  }

  private generateObjectSampleData(objectConfig: any): any {
    const sampleObject: any = {};

    for (const [fieldName, fieldConfig] of Object.entries(objectConfig)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;
        if (typedFieldConfig.object_type === 'array') {
          sampleObject[fieldName] =
            this.generateArraySampleData(typedFieldConfig);
        } else if (typedFieldConfig.object_type === 'object') {
          sampleObject[fieldName] =
            this.generateObjectSampleData(typedFieldConfig);
        } else {
          sampleObject[fieldName] =
            this.generatePrimitiveSampleData(typedFieldConfig);
        }
      } else {
        sampleObject[fieldName] = this.generatePrimitiveSampleData({
          object_type: 'string',
        });
      }
    }

    return sampleObject;
  }

  private generatePrimitiveSampleData(fieldConfig: any): any {
    if (!fieldConfig || typeof fieldConfig !== 'object') {
      return 'sample_value';
    }

    const { object_type, default: defaultValue, path } = fieldConfig;

    // Return default value if specified
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // Generate sample data based on object_type and field context
    switch (object_type) {
      case 'string':
        return this.generateStringSampleData(path);
      case 'number':
        return 123;
      case 'boolean':
        return true;
      case 'null':
        return null;
      default:
        return 'sample_value';
    }
  }

  private generateStringSampleData(path: string): string {
    // Generate appropriate sample data based on the field path
    if (path && path.includes('batch_type')) {
      return 'Discrete'; // Use valid enum value
    }
    if (path && path.includes('task_type')) {
      return 'Crossdock'; // Use a realistic task type
    }
    if (path && path.includes('location_type')) {
      return 'Zone'; // Use a realistic location type
    }
    if (path && path.includes('location_action')) {
      return 'Pick'; // Use a realistic action
    }
    if (path && path.includes('cargo_type')) {
      return 'Box'; // Use a realistic cargo type
    }
    if (path && path.includes('wait_type')) {
      return 'Trigger'; // Use a realistic wait type
    }
    if (path && path.includes('wait_condition')) {
      return 'Time'; // Use a realistic wait condition
    }
    if (path && path.includes('wait_status')) {
      return 'Not Started'; // Use a realistic status
    }
    if (path && path.includes('fallback_action')) {
      return 'Retry'; // Use a realistic fallback action
    }
    if (path && path.includes('attribute_name')) {
      return 'Color'; // Use a realistic attribute name
    }
    if (path && path.includes('attribute_value')) {
      return 'Blue'; // Use a realistic attribute value
    }
    if (path && path.includes('task_id')) {
      return 'TASK123'; // Use a realistic task ID
    }
    if (path && path.includes('job_id')) {
      return 'BATC_AmC'; // Use a realistic job ID
    }
    if (path && path.includes('location_id')) {
      return 'LOC001'; // Use a realistic location ID
    }
    if (path && path.includes('cargo_code')) {
      return 'CARGO123'; // Use a realistic cargo code
    }

    return 'sample_string'; // Default fallback
  }

  private generateInputSampleDataFromConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return {};
    }

    const sampleData: any = {};
    this.processConfigForSampleData(config, sampleData);
    return sampleData;
  }

  private processConfigForSampleData(config: any, sampleData: any): void {
    for (const [fieldName, fieldConfig] of Object.entries(config)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;

        if (typedFieldConfig.path) {
          // Extract the input field name and set the value
          const inputFieldName = this.extractInputFieldName(
            typedFieldConfig.path,
          );
          if (inputFieldName) {
            // Build nested structure based on the remaining path
            this.setNestedValue(
              sampleData,
              inputFieldName,
              this.generatePrimitiveSampleData(typedFieldConfig),
            );
          }
        } else if (typedFieldConfig.object_type === 'array') {
          // Handle array type - look for source field
          if (typedFieldConfig.source) {
            const sourceFieldName = this.extractInputFieldName(
              typedFieldConfig.source,
            );
            if (sourceFieldName && typedFieldConfig.map) {
              // Generate array sample data
              const arrayItemSample = {};
              this.processConfigForSampleData(
                typedFieldConfig.map,
                arrayItemSample,
              );
              sampleData[sourceFieldName] = [arrayItemSample];
            }
          }
        } else if (typedFieldConfig.object_type === 'object') {
          // Recursively process nested object
          this.processConfigForSampleData(typedFieldConfig, sampleData);
        }
      }
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    // Navigate/create the nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the final value
    current[parts[parts.length - 1]] = value;
  }

  private generateNestedObjectSampleData(
    objectConfig: any,
    skipParts = 1,
  ): any {
    // This method is now simplified since we handle everything in processConfigForSampleData
    const sampleObject: any = {};
    this.processConfigForSampleData(objectConfig, sampleObject);
    return sampleObject;
  }

  private extractInputFieldName(path: string): string | null {
    // Extract field name from paths and maintain nested structure
    if (path.startsWith('input.')) {
      return path.substring(6); // Remove "input." prefix but keep the rest
    }
    if (path.startsWith('op.')) {
      return path.substring(3); // Remove "op." prefix but keep the rest
    }
    if (path.startsWith('item.')) {
      return path.substring(5); // Remove "item." prefix but keep the rest
    }
    return null;
  }
}

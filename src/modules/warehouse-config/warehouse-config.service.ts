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

  private generateSampleDataFromConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return {};
    }

    const sampleData: any = {};

    // Process each field in the config
    for (const [fieldName, fieldConfig] of Object.entries(config)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;
        if (typedFieldConfig.object_type === 'array') {
          // Handle array type
          sampleData[fieldName] =
            this.generateArraySampleData(typedFieldConfig);
        } else if (typedFieldConfig.object_type === 'object') {
          // Handle nested object type
          sampleData[fieldName] =
            this.generateObjectSampleData(typedFieldConfig);
        } else {
          // Handle primitive types
          sampleData[fieldName] =
            this.generatePrimitiveSampleData(typedFieldConfig);
        }
      } else {
        // Handle direct field mappings
        sampleData[fieldName] = this.generatePrimitiveSampleData({
          object_type: 'string',
        });
      }
    }

    return sampleData;
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

    const { object_type, default: defaultValue } = fieldConfig;

    // Return default value if specified
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // Generate sample data based on object_type
    switch (object_type) {
      case 'string':
        return 'sample_string';
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

  private generateInputSampleDataFromConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return {};
    }

    const sampleData: any = {};

    // Process each field in the config
    for (const [fieldName, fieldConfig] of Object.entries(config)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;

        if (typedFieldConfig.path) {
          // Extract the input field name from the path
          const inputFieldName = this.extractInputFieldName(
            typedFieldConfig.path,
          );
          if (inputFieldName) {
            sampleData[inputFieldName] =
              this.generatePrimitiveSampleData(typedFieldConfig);
          }
        } else if (typedFieldConfig.object_type === 'array') {
          // Handle array type - look for source field
          if (typedFieldConfig.source) {
            const sourceFieldName = this.extractInputFieldName(
              typedFieldConfig.source,
            );
            if (sourceFieldName) {
              sampleData[sourceFieldName] =
                this.generateArrayInputSampleData(typedFieldConfig);
            }
          }
        } else if (typedFieldConfig.object_type === 'object') {
          // Handle nested object type - generate nested structure
          const nestedData =
            this.generateNestedObjectSampleData(typedFieldConfig);
          if (Object.keys(nestedData).length > 0) {
            // Find the parent field name from the first path in the nested object
            const parentFieldName = this.findParentFieldName(typedFieldConfig);
            if (parentFieldName) {
              sampleData[parentFieldName] = nestedData;
            } else {
              // If no parent field name found, merge directly
              Object.assign(sampleData, nestedData);
            }
          }
        }
      }
    }

    return sampleData;
  }

  private generateNestedObjectSampleData(
    objectConfig: any,
    skipParts = 1,
  ): any {
    const sampleObject: any = {};

    for (const [fieldName, fieldConfig] of Object.entries(objectConfig)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;

        if (typedFieldConfig.path) {
          this.buildNestedObjectFromPath(
            sampleObject,
            typedFieldConfig.path,
            this.generatePrimitiveSampleData(typedFieldConfig),
            skipParts,
          );
        } else if (typedFieldConfig.object_type === 'array') {
          if (typedFieldConfig.source) {
            const sourceFieldName = this.extractNestedFieldName(
              typedFieldConfig.source,
            );
            if (sourceFieldName) {
              sampleObject[sourceFieldName] = this.generateArrayInputSampleData(
                typedFieldConfig,
                skipParts,
              );
            }
          }
        } else if (typedFieldConfig.object_type === 'object') {
          // Instead of wrapping under parentFieldName, just merge the nested structure directly
          const nestedData = this.generateNestedObjectSampleData(
            typedFieldConfig,
            skipParts,
          );
          Object.assign(sampleObject, nestedData);
        }
      }
    }

    return sampleObject;
  }

  private buildNestedObjectFromPath(
    obj: any,
    path: string,
    value: any,
    skipParts = 1,
  ): void {
    // Parse path like "op.start_location.location_dimension.length"
    const parts = path.split('.');

    // Skip the first part (input, op, item) only if skipParts > 0
    const relevantParts = parts.slice(skipParts);

    if (relevantParts.length === 1) {
      // Direct field
      obj[relevantParts[0]] = value;
    } else {
      // Nested field - build the object structure
      let current = obj;
      for (let i = 0; i < relevantParts.length - 1; i++) {
        const part = relevantParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      current[relevantParts[relevantParts.length - 1]] = value;
    }
  }

  private findParentFieldName(objectConfig: any): string | null {
    // Find the first path in the object to determine the parent field name
    for (const [fieldName, fieldConfig] of Object.entries(objectConfig)) {
      if (fieldName === 'object_type') continue;

      if (typeof fieldConfig === 'object' && fieldConfig !== null) {
        const typedFieldConfig = fieldConfig as any;
        if (typedFieldConfig.path) {
          return this.extractParentFieldName(typedFieldConfig.path);
        }
      }
    }
    return null;
  }

  private extractParentFieldName(path: string): string | null {
    // Extract parent field name from paths like "op.start_location.location_id" -> "start_location"
    const parts = path.split('.');
    if (parts.length >= 2) {
      // Skip the first part (input, op, item) and return the second part
      return parts[1];
    }
    return null;
  }

  private extractNestedFieldName(path: string): string | null {
    // Extract nested field name from paths like "op.start_location.location_id" -> "location_id"
    const parts = path.split('.');
    if (parts.length >= 3) {
      // Return the last part for nested fields
      return parts[parts.length - 1];
    }
    return null;
  }

  private extractInputFieldName(path: string): string | null {
    // Extract field name from paths like "input.job_id" -> "job_id"
    if (path.startsWith('input.')) {
      return path.substring(6); // Remove "input." prefix
    }
    if (path.startsWith('op.')) {
      return path.substring(3); // Remove "op." prefix
    }
    if (path.startsWith('item.')) {
      return path.substring(5); // Remove "item." prefix
    }
    return null;
  }

  private generateArrayInputSampleData(arrayConfig: any, skipParts = 1): any[] {
    if (!arrayConfig.map) {
      return [];
    }

    // Generate a sample array with one item based on the map configuration
    const sampleItem = this.generateNestedObjectSampleData(
      arrayConfig.map,
      skipParts,
    );
    return [sampleItem];
  }
}

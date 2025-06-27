import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
} from './dto/config-mapping.dto';

@Injectable()
export class ConfigMappingService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  // Validate create task config structure
  private async validateCreateTaskConfig(config: any): Promise<void> {
    try {
      this.validateConfigStructure(config, 'TaskGenerationReq');
    } catch (error) {
      throw new BadRequestException(
        `Create task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate update task config structure
  private async validateUpdateTaskConfig(config: any): Promise<void> {
    try {
      this.validateConfigStructure(config, 'TaskUpdateReq');
    } catch (error) {
      throw new BadRequestException(
        `Update task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate cancel task config structure
  private async validateCancelTaskConfig(config: any): Promise<void> {
    try {
      this.validateConfigStructure(config, 'CancelReq');
    } catch (error) {
      throw new BadRequestException(
        `Cancel task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate config structure only (not path resolution)
  private validateConfigStructure(config: any, targetType: string): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    if (!config.object_type) {
      throw new Error('Config must have object_type property');
    }

    if (config.object_type === 'object') {
      this.validateObjectConfig(config, targetType);
    } else if (config.object_type === 'array') {
      this.validateArrayConfig(config);
    } else if (config.path) {
      this.validatePathConfig(config);
    }
  }

  // Validate object-type config structure
  private validateObjectConfig(config: any, targetType: string): void {
    const requiredFields = this.getRequiredFieldsForType(targetType);

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field '${field}' for ${targetType}`);
      }
    }

    // Recursively validate nested fields with proper type checking
    for (const [key, value] of Object.entries(config)) {
      if (key === 'object_type') continue;

      if (typeof value === 'object' && value !== null) {
        // Determine the nested type based on the field name and parent type
        const nestedType = this.getNestedFieldType(targetType, key);
        this.validateConfigStructure(value, nestedType);
      }
    }
  }

  // Validate array-type config structure
  private validateArrayConfig(config: any): void {
    if (!config.source) {
      throw new Error('Array config must have source property');
    }

    if (!config.map) {
      throw new Error('Array config must have map property');
    }

    if (typeof config.map !== 'object') {
      throw new Error('Array config map must be an object');
    }

    // Validate the map structure - determine type based on context
    // For arrays in tasks, the map should validate as 'Task'
    // For arrays in cargos, the map should validate as 'Cargo'
    let mapType = 'nested';
    if (config.source && config.source.includes('task')) {
      mapType = 'Task';
    } else if (config.source && config.source.includes('cargo')) {
      mapType = 'Cargo';
    }

    this.validateConfigStructure(config.map, mapType);
  }

  // Validate path-type config structure
  private validatePathConfig(config: any): void {
    if (!config.path || typeof config.path !== 'string') {
      throw new Error('Path config must have valid path string');
    }

    if (!config.object_type) {
      throw new Error('Path config must specify object_type');
    }

    const validTypes = [
      'string',
      'number',
      'boolean',
      'object',
      'array',
      'null',
    ];
    if (!validTypes.includes(config.object_type)) {
      throw new Error(
        `Invalid object_type '${config.object_type}'. Must be one of: ${validTypes.join(', ')}`,
      );
    }
  }

  // Get required fields for each DTO type (based on @IsNotEmpty/@IsString without @IsOptional)
  private getRequiredFieldsForType(type: string): string[] {
    switch (type) {
      case 'TaskGenerationReq':
        return ['tasks']; // Only tasks is required, others are optional
      case 'TaskUpdateReq':
        return ['batch_job_id', 'updates']; // Both are required
      case 'CancelReq':
        return []; // All fields are optional
      case 'Task': // Task object from TaskGenerationReq
        return [
          'task_id',
          'task_type',
          'start_location',
          'end_location',
          'cargos',
        ];
      case 'TaskUpdate': // Task object from TaskUpdateReq
        return ['task_id', 'start_location', 'end_location', 'cargos'];
      case 'Location':
        return [
          'location_id',
          'location_type',
          'location_action',
          'location_dimension',
        ];
      case 'Cargo':
        return ['cargo_code'];
      case 'Dimension':
        return ['length', 'width', 'height'];
      default:
        return [];
    }
  }

  // Determine the nested field type based on parent type and field name
  private getNestedFieldType(parentType: string, fieldName: string): string {
    switch (parentType) {
      case 'TaskGenerationReq':
        if (fieldName === 'tasks') return 'Task';
        break;
      case 'TaskUpdateReq':
        if (fieldName === 'updates') return 'TaskUpdate';
        break;
      case 'Task':
      case 'TaskUpdate':
        if (fieldName === 'start_location' || fieldName === 'end_location')
          return 'Location';
        if (fieldName === 'cargos') return 'Cargo';
        if (fieldName === 'wait' || fieldName === 'wait_time') return 'Wait';
        break;
      case 'Location':
        if (fieldName === 'location_dimension') return 'Dimension';
        if (fieldName === 'location_attribute') return 'Attribute';
        break;
      case 'Cargo':
        if (fieldName === 'cargo_dimension') return 'Dimension';
        if (fieldName === 'cargo_attributes') return 'Attribute';
        break;
    }
    return 'nested'; // Default fallback
  }

  // Validate get location config
  private async validateGetLocationConfig(config: any): Promise<void> {
    try {
      // For get location config, we validate the endpoint structure
      if (!config.endpoint) {
        throw new Error('endpoint configuration is required');
      }

      if (!config.endpoint.url) {
        throw new Error('endpoint.url is required');
      }

      if (!config.endpoint.method) {
        throw new Error('endpoint.method is required');
      }

      const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      if (!allowedMethods.includes(config.endpoint.method.toUpperCase())) {
        throw new Error(
          `endpoint.method must be one of: ${allowedMethods.join(', ')}`,
        );
      }

      // Validate URL format
      try {
        // Check if it's a valid URL pattern (with or without parameters)
        const urlPattern = config.endpoint.url.replace(
          /:[a-zA-Z_][a-zA-Z0-9_]*/g,
          'param',
        );
        new URL(urlPattern);
      } catch {
        throw new Error('endpoint.url must be a valid URL format');
      }
    } catch (error) {
      throw new BadRequestException(
        `Get location config validation failed: ${error.message}`,
      );
    }
  }

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

    // Validate the config before saving
    await this.validateCreateTaskConfig(createTaskConfigDto.config);

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

    // Validate the config before saving
    await this.validateUpdateTaskConfig(updateTaskConfigDto.config);

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

    // Validate the config before saving
    await this.validateCancelTaskConfig(cancelTaskConfigDto.config);

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

    // Validate the config before saving
    await this.validateGetLocationConfig(getLocationConfigDto.config);

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

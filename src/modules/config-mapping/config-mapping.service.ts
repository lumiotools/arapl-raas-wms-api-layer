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
  ConfigMappingResponseDto,
  ConfigMappingUpdateResponseDto,
} from './dto/config-mapping.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigMappingService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  // Load reference config from @/config_mapping
  private loadReferenceConfig(configType: string): any {
    // Try multiple possible paths for the config file
    const possiblePaths = [
      // Development path (from src directory)
      path.join(__dirname, '../../config_mapping/cli', `${configType}.json`),
      // Production path (from dist directory)
      path.join(
        __dirname,
        '../../../src/config_mapping/cli',
        `${configType}.json`,
      ),
      // Alternative production path
      path.join(process.cwd(), 'src/config_mapping/cli', `${configType}.json`),
      // Root directory path
      path.join(process.cwd(), 'config_mapping/cli', `${configType}.json`),
    ];

    let configContent: string;
    let lastError: Error | null = null;

    for (const configPath of possiblePaths) {
      try {
        configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
      } catch (error) {
        lastError = error as Error;
        // Continue to next path
      }
    }

    // If we get here, none of the paths worked
    throw new Error(
      `Failed to load reference config for ${configType}. Tried paths: ${possiblePaths.join(', ')}. Last error: ${lastError?.message}`,
    );
  }

  // Compare config structures, ignoring path and default values
  private compareConfigStructures(
    userConfig: any,
    referenceConfig: any,
    configPath: string = '',
  ): void {
    // Check if both are objects
    if (typeof userConfig !== 'object' || typeof referenceConfig !== 'object') {
      throw new Error(
        `Type mismatch at ${configPath}: expected object, got ${typeof userConfig}`,
      );
    }

    // Check if both are null
    if (userConfig === null && referenceConfig === null) {
      return;
    }

    // Check if one is null and the other isn't
    if (userConfig === null || referenceConfig === null) {
      throw new Error(
        `Null mismatch at ${configPath}: user config is ${userConfig === null ? 'null' : 'object'}, reference is ${referenceConfig === null ? 'null' : 'object'}`,
      );
    }

    // Check object_type
    if (userConfig.object_type !== referenceConfig.object_type) {
      throw new Error(
        `object_type mismatch at ${configPath}: expected "${referenceConfig.object_type}", got "${userConfig.object_type}"`,
      );
    }

    // For path-type configs, only check object_type (ignore path and default)
    if (referenceConfig.path) {
      return;
    }

    // For array-type configs
    if (userConfig.object_type === 'array') {
      if (!userConfig.source || !referenceConfig.source) {
        throw new Error(`Array config missing source at ${configPath}`);
      }
      if (!userConfig.map || !referenceConfig.map) {
        throw new Error(`Array config missing map at ${configPath}`);
      }
      // Recursively validate the map structure
      this.compareConfigStructures(
        userConfig.map,
        referenceConfig.map,
        `${configPath}.map`,
      );
      return;
    }

    // For object-type configs, check all fields except path and default
    const userKeys = Object.keys(userConfig).filter(
      (key) => key !== 'path' && key !== 'default',
    );
    const referenceKeys = Object.keys(referenceConfig).filter(
      (key) => key !== 'path' && key !== 'default',
    );

    // Check if all required fields from reference exist in user config
    for (const key of referenceKeys) {
      if (!userKeys.includes(key)) {
        throw new Error(`Missing field "${key}" at ${configPath}`);
      }
    }

    // Check if user config has extra fields not in reference
    for (const key of userKeys) {
      if (!referenceKeys.includes(key)) {
        throw new Error(`Extra field "${key}" not allowed at ${configPath}`);
      }
    }

    // Recursively validate nested objects
    for (const key of userKeys) {
      const userValue = userConfig[key];
      const referenceValue = referenceConfig[key];

      if (
        typeof userValue === 'object' &&
        userValue !== null &&
        typeof referenceValue === 'object' &&
        referenceValue !== null
      ) {
        this.compareConfigStructures(
          userValue,
          referenceValue,
          `${configPath}.${key}`,
        );
      }
    }
  }

  // Validate create task config structure against reference
  private async validateCreateTaskConfig(config: any): Promise<void> {
    try {
      const referenceConfig = this.loadReferenceConfig('create_task');
      this.compareConfigStructures(
        config,
        referenceConfig,
        'create_task_config',
      );
    } catch (error) {
      throw new BadRequestException(
        `Create task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate update task config structure against reference
  private async validateUpdateTaskConfig(config: any): Promise<void> {
    try {
      const referenceConfig = this.loadReferenceConfig('update_task');
      this.compareConfigStructures(
        config,
        referenceConfig,
        'update_task_config',
      );
    } catch (error) {
      throw new BadRequestException(
        `Update task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate cancel task config structure against reference
  private async validateCancelTaskConfig(config: any): Promise<void> {
    try {
      const referenceConfig = this.loadReferenceConfig('cancel_task');
      this.compareConfigStructures(
        config,
        referenceConfig,
        'cancel_task_config',
      );
    } catch (error) {
      throw new BadRequestException(
        `Cancel task config validation failed: ${error.message}`,
      );
    }
  }

  // Validate get location config structure against reference
  private async validateGetLocationConfig(config: any): Promise<void> {
    try {
      const referenceConfig = this.loadReferenceConfig('get_empty_location');
      this.compareConfigStructures(
        config,
        referenceConfig,
        'get_location_config',
      );
    } catch (error) {
      throw new BadRequestException(
        `Get location config validation failed: ${error.message}`,
      );
    }
  }

  async updateCreateTaskConfig(
    warehouseId: string,
    createTaskConfigDto: CreateTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
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
  ): Promise<ConfigMappingUpdateResponseDto> {
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
  ): Promise<ConfigMappingUpdateResponseDto> {
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
  ): Promise<ConfigMappingUpdateResponseDto> {
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

  async getConfigMapping(
    warehouseId: string,
  ): Promise<ConfigMappingResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { warehouse_id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    return this.mapToResponseDto(warehouse);
  }

  private mapToResponseDto(warehouse: Warehouse): ConfigMappingResponseDto {
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

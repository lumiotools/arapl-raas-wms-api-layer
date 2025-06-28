import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Base config field DTO
export class ConfigFieldDto {
  @IsString()
  object_type: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  default?: any;
}

// Primitive type config DTOs
export class StringConfigDto extends ConfigFieldDto {
  declare object_type: 'string';
}

export class NumberConfigDto extends ConfigFieldDto {
  declare object_type: 'number';
}

export class BooleanConfigDto extends ConfigFieldDto {
  declare object_type: 'boolean';
}

export class NullConfigDto extends ConfigFieldDto {
  declare object_type: 'null';
}

// Array config DTO
export class ArrayConfigDto extends ConfigFieldDto {
  declare object_type: 'array';

  @IsString()
  source: string;

  @ValidateNested()
  @Type(() => Object)
  map: any; // This will be validated recursively
}

// Location dimension DTO
export class LocationDimensionConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => NumberConfigDto)
  length: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  width: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  height: NumberConfigDto;
}

// Location attribute DTO
export class LocationAttributeConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Location DTO
export class LocationConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_action: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_type: StringConfigDto;

  @ValidateNested()
  @Type(() => LocationDimensionConfigDto)
  location_dimension: LocationDimensionConfigDto;

  @ValidateNested()
  @Type(() => LocationAttributeConfigDto)
  location_attribute: LocationAttributeConfigDto;
}

// Cargo dimension DTO
export class CargoDimensionConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => NumberConfigDto)
  length: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  width: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  height: NumberConfigDto;
}

// Cargo attributes DTO
export class CargoAttributesConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Cargo DTO
export class CargoConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_code: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_type: StringConfigDto;

  @ValidateNested()
  @Type(() => CargoDimensionConfigDto)
  cargo_dimension: CargoDimensionConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  cargo_weight: NumberConfigDto;

  @ValidateNested()
  @Type(() => CargoAttributesConfigDto)
  cargo_attributes: CargoAttributesConfigDto;
}

// Wait configuration DTO
export class WaitConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_type: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_condition: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  start_location_wait_time: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  end_location_wait_time: NumberConfigDto;

  @ValidateNested()
  @Type(() => BooleanConfigDto)
  start_location_available_wait: BooleanConfigDto;

  @ValidateNested()
  @Type(() => BooleanConfigDto)
  end_location_available_wait: BooleanConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_status: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  timeout: NumberConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  fallback_action: StringConfigDto;
}

// Task DTO for create task
export class CreateTaskConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  task_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  task_type: StringConfigDto;

  @ValidateNested()
  @Type(() => NullConfigDto)
  task_dependency: NullConfigDto;

  @ValidateNested()
  @Type(() => LocationConfigDto)
  start_location: LocationConfigDto;

  @ValidateNested()
  @Type(() => LocationConfigDto)
  end_location: LocationConfigDto;

  @ValidateNested()
  @Type(() => WaitConfigDto)
  wait: WaitConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  cargos: ArrayConfigDto;
}

// Create Task Configuration DTO - with strict field validation
export class CreateTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_job_id: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  batch_priority: NumberConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_type: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  batch_frequency: NumberConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  tasks: ArrayConfigDto;
}

// Update Task Configuration DTO
export class UpdateTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_job_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  updates: ArrayConfigDto;
}

// Cancel Task Configuration DTO
export class CancelTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  reason: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;
}

// Get Location Configuration DTO
export class GetLocationValidationDto {
  @ValidateNested()
  @Type(() => Object)
  endpoint: any;

  @ValidateNested()
  @Type(() => Object)
  request: any;

  @ValidateNested()
  @Type(() => Object)
  response: any;
}

import { IsString, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Primitive config DTOs
export class StringConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  // default is optional and can be any type
  default?: any;
}

export class NumberConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  default?: any;
}

export class BooleanConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  default?: any;
}

export class NullConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
}

// Attribute DTO
export class CreateTaskCargoAttributeDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Cargo Dimension DTO
export class CreateTaskCargoDimensionDto {
  @IsString()
  object_type: string;
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

// Cargo DTO
export class CreateTaskCargoDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_code: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_type: StringConfigDto;
  @ValidateNested()
  @Type(() => CreateTaskCargoDimensionDto)
  cargo_dimension: CreateTaskCargoDimensionDto;
  @ValidateNested()
  @Type(() => NumberConfigDto)
  cargo_weight: NumberConfigDto;
  @ValidateNested()
  @Type(() => CreateTaskCargoAttributeDto)
  cargo_attributes: CreateTaskCargoAttributeDto;
}

// Cargos Array DTO
export class CreateTaskCargosArrayDto {
  @IsString()
  object_type: string;
  @IsString()
  source: string;
  @ValidateNested()
  @Type(() => CreateTaskCargoDto)
  map: CreateTaskCargoDto;
}

// Location Attribute DTO
export class CreateTaskLocationAttributeDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Location Dimension DTO
export class CreateTaskLocationDimensionDto {
  @IsString()
  object_type: string;
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

// Location DTO
export class CreateTaskLocationDto {
  @IsString()
  object_type: string;
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
  @Type(() => CreateTaskLocationDimensionDto)
  location_dimension: CreateTaskLocationDimensionDto;
  @ValidateNested()
  @Type(() => CreateTaskLocationAttributeDto)
  location_attribute: CreateTaskLocationAttributeDto;
}

// End Location Attribute DTO (null type)
export class CreateTaskEndLocationAttributeDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => NullConfigDto)
  attribute_name: NullConfigDto;
  @ValidateNested()
  @Type(() => NullConfigDto)
  attribute_value: NullConfigDto;
}

// End Location DTO
export class CreateTaskEndLocationDto {
  @IsString()
  object_type: string;
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
  @Type(() => CreateTaskLocationDimensionDto)
  location_dimension: CreateTaskLocationDimensionDto;
  @ValidateNested()
  @Type(() => CreateTaskEndLocationAttributeDto)
  location_attribute: CreateTaskEndLocationAttributeDto;
}

// Wait DTO
export class CreateTaskWaitDto {
  @IsString()
  object_type: string;
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

// Task Map DTO
export class CreateTaskMapDto {
  @IsString()
  object_type: string;
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
  @Type(() => CreateTaskLocationDto)
  start_location: CreateTaskLocationDto;
  @ValidateNested()
  @Type(() => CreateTaskEndLocationDto)
  end_location: CreateTaskEndLocationDto;
  @ValidateNested()
  @Type(() => CreateTaskWaitDto)
  wait: CreateTaskWaitDto;
  @ValidateNested()
  @Type(() => CreateTaskCargosArrayDto)
  cargos: CreateTaskCargosArrayDto;
}

// Tasks Array DTO
export class CreateTaskTasksArrayDto {
  @IsString()
  object_type: string;
  @IsString()
  source: string;
  @ValidateNested()
  @Type(() => CreateTaskMapDto)
  map: CreateTaskMapDto;
}

// Root DTO
export class CreateTaskConfigRootDto {
  @IsString()
  object_type: string;
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
  @Type(() => CreateTaskTasksArrayDto)
  tasks: CreateTaskTasksArrayDto;
}

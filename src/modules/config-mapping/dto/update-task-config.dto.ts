import {
  IsString,
  IsNumber,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

// Primitive config DTOs
export class StringConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

export class NumberConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

export class NullConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

// Cargo Dimension DTO
export class UpdateTaskCargoDimensionDto {
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
export class UpdateTaskCargoDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_code: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_type: StringConfigDto;
  @ValidateNested()
  @Type(() => UpdateTaskCargoDimensionDto)
  cargo_dimension: UpdateTaskCargoDimensionDto;
  @ValidateNested()
  @Type(() => NumberConfigDto)
  cargo_weight: NumberConfigDto;
}

// Cargos Array DTO
export class UpdateTaskCargosArrayDto {
  @IsString()
  object_type: string;
  @IsString()
  source: string;
  @ValidateNested()
  @Type(() => UpdateTaskCargoDto)
  map: UpdateTaskCargoDto;
}

// Location Dimension DTO
export class UpdateTaskLocationDimensionDto {
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

// Start Location DTO
export class UpdateTaskStartLocationDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  location_id: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  location_action: StringConfigDto;
  @ValidateNested()
  @Type(() => NullConfigDto)
  location_zone: NullConfigDto;
  @ValidateNested()
  @Type(() => UpdateTaskLocationDimensionDto)
  location_dimension: UpdateTaskLocationDimensionDto;
}

// End Location DTO
export class UpdateTaskEndLocationDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  location_id: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  location_action: StringConfigDto;
  @ValidateNested()
  @Type(() => NullConfigDto)
  location_zone: NullConfigDto;
  @ValidateNested()
  @Type(() => UpdateTaskLocationDimensionDto)
  location_dimension: UpdateTaskLocationDimensionDto;
}

// Wait Time DTO
export class UpdateTaskWaitTimeDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_type: StringConfigDto;
  @ValidateNested()
  @Type(() => NumberConfigDto)
  start_location_wait_time: NumberConfigDto;
  @ValidateNested()
  @Type(() => NumberConfigDto)
  end_location_wait_time: NumberConfigDto;
}

// Task Map DTO
export class UpdateTaskMapDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  task_id: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  task_type: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  task_dependency: StringConfigDto;
  @ValidateNested()
  @Type(() => UpdateTaskStartLocationDto)
  start_location: UpdateTaskStartLocationDto;
  @ValidateNested()
  @Type(() => UpdateTaskEndLocationDto)
  end_location: UpdateTaskEndLocationDto;
  @ValidateNested()
  @Type(() => UpdateTaskWaitTimeDto)
  wait_time: UpdateTaskWaitTimeDto;
  @ValidateNested()
  @Type(() => UpdateTaskCargosArrayDto)
  cargos: UpdateTaskCargosArrayDto;
}

// Updates Array DTO
export class UpdateTaskUpdatesArrayDto {
  @IsString()
  object_type: string;
  @IsString()
  source: string;
  @ValidateNested()
  @Type(() => UpdateTaskMapDto)
  map: UpdateTaskMapDto;
}

// Root DTO
export class UpdateTaskConfigRootDto {
  @IsString()
  object_type: string;
  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_job_id: StringConfigDto;
  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;
  @ValidateNested()
  @Type(() => UpdateTaskUpdatesArrayDto)
  updates: UpdateTaskUpdatesArrayDto;
}

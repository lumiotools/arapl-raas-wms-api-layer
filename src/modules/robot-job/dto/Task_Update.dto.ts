import { Attribute, Dimension, Wait } from './Task_Generation.dto';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Cargo {
  @IsString()
  @IsNotEmpty()
  cargo_code: string;

  @ValidateNested()
  @Type(() => Dimension)
  cargo_dimension: Dimension;

  @IsOptional()
  @IsNumber()
  cargo_quantity?: number;

  @IsOptional()
  @IsNumber()
  cargo_weight?: number;
}

export class Location {
  @IsString()
  @IsNotEmpty()
  location_id: string;

  @ValidateNested()
  @Type(() => Dimension)
  location_dimension: Dimension;

  @IsOptional()
  @IsNumber()
  cargo_quantity: number;
}

export class Task {
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @IsOptional()
  @IsString()
  task_dependency: string;

  @ValidateNested()
  @Type(() => Location)
  start_location: Location;

  @ValidateNested()
  @Type(() => Location)
  end_location: Location;

  @IsOptional()
  @ValidateNested()
  @Type(() => Wait)
  wait_time : Wait;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Cargo)
  cargos: Cargo[];
}

export class TaskUpdateReq {
  @IsString()
  @IsNotEmpty()
  batch_job_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  updates: Task[];

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TaskUpdateRes {
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  updated_at: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
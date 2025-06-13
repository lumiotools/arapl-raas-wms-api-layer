import { Optional } from '@nestjs/common';
import { Attribute, Dimension, Wait } from './Task_Generation.dto';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Cargo {
  cargo_code: string;
  cargo_dimension: Dimension;

  @Optional()
  cargo_quantity: number;

  @Optional()
  cargo_weight: number;
}

export class Location {
  location_id: string;
  location_dimension: Dimension;

  @Optional()
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
  wait_time: Wait;

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
  timestamp: string;
}

export class TaskUpdateRes {
  task_id: string;
  status: string;
  updated_at: string;
  message: string;
}

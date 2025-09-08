// import { Type } from "class-transformer";
// import { 
//     IsOptional, 
//     IsString, 
//     IsNumber, 
//     IsEnum, 
//     IsArray, 
//     ValidateNested, 
//     Min, 
//     Max,
//     IsNotEmpty,
//     IsPositive,
//     IsBoolean
// } from "class-validator";

// export class Dimension {
//     @IsNumber()
//     @IsPositive()
//     @IsNotEmpty()
//     length: number;

//     @IsNumber()
//     @IsPositive()
//     @IsNotEmpty()
//     width: number;

//     @IsNumber()
//     @IsPositive()
//     @IsNotEmpty()
//     height: number;
// }

// export class Attribute {
//     @IsString()
//     @IsNotEmpty()
//     attribute_name: string;

//     @IsString()
//     @IsNotEmpty()
//     attribute_value: string;
// }

// export class Cargo {
//     @IsString()
//     @IsNotEmpty()
//     cargo_code: string;

//     @IsOptional()
//     @IsString()
//     cargo_type?: string;

//     @IsOptional()
//     @ValidateNested({each: true })
//     @Type(() => Dimension)
//     cargo_dimension?: Dimension;

//     @IsOptional()
//     @ValidateNested({each: true })
//     @Type(() => Attribute)
//     cargo_attributes?: Attribute;

//     @IsOptional()
//     @IsNumber()
//     @IsPositive()
//     cargo_weight?: number;
// }

// export enum WaitType {
//     Trigger = "Trigger",
//     Conditional = "Conditional"
// }

// export enum WaitCondition {
//     Time = "Time",
//     LocationAvailable = "LocationAvailable"
// }
// export enum WaitStatus{
//     NotStarted = "Not Started",
//     StartWait =  "Start Wait",
//     EndWait = "End Wait"
// }
// export enum FallbackAction {
//     Retry = "Retry",
//     Reroute = "Reroute",
//     Error = "Error"
    
// }

// export class Wait {
//     @IsEnum(WaitType)
//     @IsNotEmpty()
//     wait_type: WaitType;

//     @IsEnum(WaitCondition)
//     @IsOptional()
//     wait_condition?: WaitCondition;

//     @IsOptional()
//     @IsNumber()
//     @Min(0)
//     start_location_wait_time?: number = 0;

//     @IsOptional()
//     @IsNumber()
//     @Min(0)
//     end_location_wait_time?: number = 0;

//     @IsOptional()
//     @IsBoolean()
//     start_location_available_wait ?: boolean = false;

//     @IsOptional()
//     @IsBoolean()
//     end_location_available_wait ?: boolean = false;

//     @IsOptional()
//     @IsEnum(WaitStatus)
//     wait_status ?: WaitStatus = WaitStatus.NotStarted;

//     @IsOptional()
//     @IsNumber()
//     timeout?: number = 1800;

//     @IsOptional()
//     @IsEnum(FallbackAction)
//     fallback_action?: FallbackAction = FallbackAction.Error;
// }

// export enum LocationAction {
//     Pick = "Pick",
//     Drop = "Drop",
//     Nop = "Nop",
//     WaitPick = "WaitPick",
//     WaitDrop = "WaitDrop",
//     Wait = "Wait",
//     Destack = "Destack"
// }
// export enum LocationType {
//     Zone = "Zone",
//     Aisle = "Aisle",
//     Bay = "Bay",
//     Pallet = "Pallet",
//     Transient = "Transient"
// }

// export class Location {
//     @IsString()
//     @IsNotEmpty()
//     location_id: string;

//     @IsEnum(LocationType)
//     @IsNotEmpty()
//     location_type: LocationType;

//     @IsEnum(LocationAction)
//     @IsNotEmpty()
//     location_action: LocationAction;

//     @IsNotEmpty()
//     @ValidateNested({each: true})
//     @Type(() => Dimension)
//     location_dimension: Dimension;

//     @IsOptional()
//     @ValidateNested({each:true})
//     @Type(() => Attribute)
//     location_attribute?: Attribute;
// }

// export enum TaskType {
//     CrossDocking = "Crossdock",
//     Putaway = "Putaway",
//     Picking = "Picking",
//     GoodsToPerson = "GoodsToPerson",
// }

// export class Task {
//     @IsString()
//     @IsNotEmpty()
//     task_id: string;

//     @IsEnum(TaskType)
//     @IsNotEmpty()
//     task_type: TaskType;

//     @IsOptional()
//     @IsString()
//     task_dependency?: string;

//     @ValidateNested({each: true})
//     @Type(() => Location)
//     start_location: Location;

//     @ValidateNested({each: true})
//     @Type(() => Location)
//     end_location: Location;

//     @IsOptional()
//     @ValidateNested({each: true})
//     @Type(() => Wait)
//     wait ?: Wait;

//     @IsArray()
//     @ValidateNested({ each: true })
//     @Type(() => Cargo)
//     cargos: Cargo[];
// }

// export enum batch_type {
//     Continuous = "Continuous",
//     DISCRETE = "DISCRETE"
// }

// export class TaskGenerationReq {
//     @IsString()
//     @IsOptional()
//     batch_job_id?: string;

//     @IsOptional()
//     @IsNumber()
//     @Min(0)
//     @Max(10)
//     batch_priority?: number = 5;

//     @IsOptional()
//     @IsEnum(batch_type)
//     batch_type?: batch_type = batch_type.DISCRETE;

//     @IsArray()
//     @ValidateNested({ each: true })
//     @Type(() => Task)
//     tasks: Task[];

//     @IsOptional()
//     @IsNumber()
//     @Min(1)
//     batch_frequency?: number;
// }

// export class TaskGenerationRes {
//     @IsString()
//     @IsNotEmpty()
//     batch_id: string;

//     @IsString()
//     @IsNotEmpty()
//     status: string;
// }

import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum WaitType {
  Trigger = 'Trigger',
  Conditional = 'Conditional',
}

export enum WaitCondition {
  Time = 'Time',
  LocationAvailable = 'LocationAvailable',
}

export enum WaitStatus {
  NotStarted = 'Not Started',
  StartWait = 'Start Wait',
  EndWait = 'End Wait',
}

export enum FallbackAction {
  Retry = 'Retry',
  Reroute = 'Reroute',
  Error = 'Error',
}

export enum LocationAction {
  PICK = 'PICK',
  DROP = 'DROP',
  NOP_RESUME = 'NOP-resume',
  NOP_PAUSE = 'NOP-pause',
}

export enum LocationType {
  Zone = 'Zone',
  Aisle = 'Aisle',
  Bay = 'Bay',
  Pallet = 'PALLET',
  Transient = 'Transient',
}

export enum TaskType {
  CrossDocking = 'Crossdock',
  Putaway = 'Putaway',
  Picking = 'Picking',
  GoodsToPerson = 'GOODSTOPERSON',
}

export enum batch_type {
  Continuous = 'CONTINUOUS',
  DISCRETE = 'DISCRETE',
}

// Classes
export class Dimension {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  length: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  width: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  height: number;
}

export class Attribute {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty()
  attribute_name: string;

  @ApiProperty({ example: 'Blue' })
  @IsString()
  @IsNotEmpty()
  attribute_value: string;
}

export class Cargo {
  @ApiProperty({ example: 'CARGO123' })
  @IsString()
  @IsNotEmpty()
  cargo_code: string;

  @ApiPropertyOptional({ example: 'Box' })
  @IsOptional()
  @IsString()
  cargo_type?: string;

  @ApiPropertyOptional({ type: Dimension })
  @IsOptional()
  @ValidateNested()
  @Type(() => Dimension)
  cargo_dimension?: Dimension;

  @ApiPropertyOptional({ type: Attribute })
  @IsOptional()
  @ValidateNested()
  @Type(() => Attribute)
  cargo_attributes?: Attribute;

  @ApiPropertyOptional({ example: 15.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cargo_weight?: number;
}

export class Wait {
  @ApiProperty({ enum: WaitType })
  @IsEnum(WaitType)
  @IsNotEmpty()
  wait_type: WaitType;

  @ApiPropertyOptional({ enum: WaitCondition })
  @IsOptional()
  @IsEnum(WaitCondition)
  wait_condition?: WaitCondition;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  start_location_wait_time?: number = 0;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  end_location_wait_time?: number = 0;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  start_location_available_wait?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  end_location_available_wait?: boolean = false;

  @ApiPropertyOptional({ enum: WaitStatus, default: WaitStatus.NotStarted })
  @IsOptional()
  @IsEnum(WaitStatus)
  wait_status?: WaitStatus = WaitStatus.NotStarted;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber()
  timeout?: number = 1800;

  @ApiPropertyOptional({ enum: FallbackAction })
  @IsOptional()
  @IsEnum(FallbackAction)
  fallback_action?: FallbackAction = FallbackAction.Error;
}

export class Location {
  @ApiProperty({ example: 'LOC001' })
  @IsString()
  @IsNotEmpty()
  location_id: string;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  @IsNotEmpty()
  location_type: LocationType;

  @ApiProperty({ enum: LocationAction })
  @IsEnum(LocationAction)
  @IsNotEmpty()
  location_action: LocationAction;

  @ApiProperty({ type: Dimension })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Dimension)
  location_dimension: Dimension;

  @ApiPropertyOptional({ type: Attribute })
  @IsOptional()
  @ValidateNested()
  @Type(() => Attribute)
  location_attribute?: Attribute;
}

export class Task {
  @ApiProperty({ example: 'TASK123' })
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @ApiProperty({ enum: TaskType })
  @IsEnum(TaskType)
  @IsNotEmpty()
  task_type: TaskType;

  @ApiPropertyOptional({ example: 'TASK122' })
  @IsOptional()
  @IsString()
  task_dependency?: string;

  @ApiPropertyOptional({
    description: 'Assigned robot ID for the task (ignored if warehouse has no robot access)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  robot_id?: string | null;

  @ApiProperty({ type: Location })
  @ValidateNested()
  @Type(() => Location)
  start_location: Location;

  @ApiProperty({ type: Location })
  @ValidateNested()
  @Type(() => Location)
  end_location: Location;

  @ApiPropertyOptional({ type: Wait })
  @IsOptional()
  @ValidateNested()
  @Type(() => Wait)
  wait?: Wait;

  @ApiProperty({ type: [Cargo] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Cargo)
  cargos?: Cargo[];
}

export class TaskGenerationReq {
  @ApiPropertyOptional({ example: 'BATCH_ABC' })
  @IsString()
  @IsOptional()
  batch_job_id?: string;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  batch_priority?: number = 5;

  @ApiPropertyOptional({ enum: batch_type, default: batch_type.DISCRETE })
  @IsOptional()
  @IsEnum(batch_type)
  batch_type?: batch_type = batch_type.DISCRETE;

  @ApiProperty({ type: [Task] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  tasks: Task[];

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  batch_frequency?: number;
}

export class TaskGenerationRes {
  @ApiProperty({ example: 'BATCH_001' })
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @ApiProperty({ example: 'success' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

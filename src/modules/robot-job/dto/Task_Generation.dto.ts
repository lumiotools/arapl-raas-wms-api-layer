import { Type } from "class-transformer";
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
    IsBoolean
} from "class-validator";

export class Dimension {
    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    length: number;

    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    width: number;

    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    height: number;
}

export class Attribute {
    @IsString()
    @IsNotEmpty()
    attribute_name: string;

    @IsString()
    @IsNotEmpty()
    attribute_value: string;
}

export class Cargo {
    @IsString()
    @IsNotEmpty()
    cargo_code: string;

    @IsOptional()
    @IsString()
    cargo_type?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => Dimension)
    cargo_dimension?: Dimension;

    @IsOptional()
    @ValidateNested()
    @Type(() => Attribute)
    cargo_attributes?: Attribute;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    cargo_weight?: number;
}

export enum WaitType {
    Trigger = "Trigger",
    Conditional = "Conditional"
}

export enum WaitCondition {
    Time = "Time",
    LocationAvailable = "LocationAvailable"
}
export enum WaitStatus{
    NotStarted = "Not Started",
    StartWait =  "Start Wait",
    EndWait = "End Wait"
}
export enum FallbackAction {
    Retry = "Retry",
    Reroute = "Reroute",
    Error = "Error"
    
}

export class Wait {
    @IsEnum(WaitType)
    @IsNotEmpty()
    wait_type: WaitType;

    @IsEnum(WaitCondition)
    @IsOptional()
    wait_condition?: WaitCondition;

    @IsOptional()
    @IsNumber()
    @Min(0)
    start_location_wait_time?: number = 0;

    @IsOptional()
    @IsNumber()
    @Min(0)
    end_location_wait_time?: number = 0;

    @IsOptional()
    @IsBoolean()
    start_location_available_wait ?: boolean = false;

    @IsOptional()
    @IsBoolean()
    end_location_available_wait ?: boolean = false;

    @IsOptional()
    @IsEnum(WaitStatus)
    wait_status ?: WaitStatus = WaitStatus.NotStarted;

    @IsOptional()
    @IsNumber()
    timeout?: number = 1800;

    @IsOptional()
    @IsEnum(FallbackAction)
    fallback_action?: FallbackAction = FallbackAction.Error;
}

export enum LocationAction {
    Pick = "Pick",
    Drop = "Drop",
    Nop = "Nop",
    WaitPick = "WaitPick",
    WaitDrop = "WaitDrop",
    Wait = "Wait",
    Destack = "Destack"
}
export enum LocationType {
    Zone = "Zone",
    Aisle = "Aisle",
    Bay = "Bay",
    Pallet = "Pallet",
    Transient = "Transient"
}

export class Location {
    @IsString()
    @IsNotEmpty()
    location_id: string;

    @IsEnum(LocationType)
    @IsNotEmpty()
    location_type: LocationType;

    @IsEnum(LocationAction)
    @IsNotEmpty()
    location_action: LocationAction;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => Dimension)
    location_dimension: Dimension;

    @IsOptional()
    @ValidateNested()
    @Type(() => Attribute)
    location_attribute?: Attribute;
}

export enum TaskType {
    CrossDocking = "Crossdock",
    Putaway = "Putaway",
    Picking = "Picking",
    GoodsToPerson = "GoodsToPerson",
}

export class Task {
    @IsString()
    @IsNotEmpty()
    task_id: string;

    @IsEnum(TaskType)
    @IsNotEmpty()
    task_type: TaskType;

    @IsOptional()
    @IsString()
    task_dependency?: string;

    @ValidateNested()
    @Type(() => Location)
    start_location: Location;

    @ValidateNested()
    @Type(() => Location)
    end_location: Location;

    @IsOptional()
    @ValidateNested()
    @Type(() => Wait)
    wait ?: Wait;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Cargo)
    cargos: Cargo[];
}

export enum batch_type {
    Continuous = "Continuous",
    Discrete = "Discrete"
}

export class TaskGenerationReq {
    @IsString()
    @IsOptional()
    batch_job_id?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10)
    batch_priority?: number = 5;

    @IsOptional()
    @IsEnum(batch_type)
    batch_type?: batch_type = batch_type.Discrete;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Task)
    tasks: Task[];

    @IsOptional()
    @IsNumber()
    @Min(1)
    batch_frequency?: number;
}

export class TaskGenerationRes {
    @IsString()
    @IsNotEmpty()
    batch_id: string;

    @IsString()
    @IsNotEmpty()
    status: string;
}
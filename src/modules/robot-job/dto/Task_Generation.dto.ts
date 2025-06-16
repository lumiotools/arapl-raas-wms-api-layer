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
    IsPositive
} from "class-validator";

export class Dimension {
    @IsNumber()
    @IsPositive()
    length: number;

    @IsNumber()
    @IsPositive()
    width: number;

    @IsNumber()
    @IsPositive()
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

export class Wait {
    @IsString()
    @IsNotEmpty()
    wait_type: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    start_location_wait_time: number = 0;

    @IsOptional()
    @IsNumber()
    @Min(0)
    end_location_wait_time: number = 0;
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

export class Location {
    @IsString()
    @IsNotEmpty()
    location_id: string;

    @IsOptional()
    @IsString()
    location_zone?: string;

    @IsEnum(LocationAction)
    location_action: LocationAction;

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
}

export class Task {
    @IsString()
    @IsNotEmpty()
    task_id: string;

    @IsOptional()
    @IsString()
    task_pallet_id?: string;

    @IsEnum(TaskType)
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
    wait_time?: Wait;

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
    @IsNotEmpty()
    batch_job_id: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    batch_priority: number = 5;

    @IsOptional()
    @IsEnum(batch_type)
    batch_type: batch_type = batch_type.Discrete;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Task)
    tasks: Task[];

    @IsOptional()
    @IsNumber()
    @Min(1)
    batch_frequency?: number;

    @IsOptional()
    @IsString()
    warehouse_id?: string;
}

export class TaskGenerationRes {
    @IsString()
    @IsNotEmpty()
    batch_job_id: string;

    @IsString()
    @IsNotEmpty()
    status: string;
}
import { Optional } from "@nestjs/common";



export class Dimension {
    length: number; 
    width: number; 
    height: number; 
}


export class Attribute {
    attribute_name: string;
    attribute_value: string; 
}

export class Cargo{
    cargo_code: string;

    @Optional()
    cargo_type: string; 

    @Optional()
    cargo_dimension: Dimension;

    @Optional()
    cargo_attributes: Attribute;

    @Optional()
    cargo_weight: number;
}

export class Wait{
    wait_type: string;
    start_location_wait_time: number=0;
    end_location_wait_time: number=0;
}
enum LocationAction {
    Pick = "Pick",
    Drop = "Drop",
    Nop = "Nop",
    WaitPick = "WaitPick",
    WaitDrop = "WaitDrop",
    Wait = "Wait",
    Destack = "Destack"
}
export class Location {
    location_id: string;

    @Optional()
    location_zone: string;

    location_action: LocationAction;

    location_dimension: Dimension;

    @Optional()
    location_attribute: Attribute;
}

enum TaskType{
    CrossDocking = "Crossdock",
    Putaway = "Putaway",
    Picking = "Picking",
}
export class Task {
    task_id: string;

    @Optional()
    task_pallet_id: string;

    task_type: TaskType;

    @Optional()
    task_dependency: string;

    start_location: Location; //**** */

    end_location: Location;

    // @Optional()
    // start_location_action: string;

    // @Optional()
    // end_location_action: string;

    @Optional()
    wait_time: Wait;

    cargos: Cargo[];
}

export enum batch_type {
    Continuous = "Continuous",
    Discrete = "Discrete"
}

export class TaskGenerationReq {
    batch_job_id: string;

    @Optional()
    batch_priority: number = 5;

    @Optional()
    batch_type: batch_type = batch_type.Discrete;

    tasks: Task[];

    @Optional()
    batch_frequency: number;
}

export class TaskGenerationRes {
    batch_job_id: string;
    status: string;
}
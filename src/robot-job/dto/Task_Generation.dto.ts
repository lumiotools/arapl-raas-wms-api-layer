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
    start_location_wait_time: number;

    @Optional()
    end_location_wait_time: number;
}

export class Location {
    location_id: string;

    @Optional()
    location_action: string;

    location_dimension: Dimension;

    @Optional()
    location_attribute: Attribute;
}

export class Task {
    task_id: string;

    @Optional()
    task_dependency: string;

    start_location_id: Location;
    end_location_id: Location;

    @Optional()
    start_location_action: string;

    @Optional()
    end_location_action: string;

    @Optional()
    wait_time: Wait;

    cargos: Cargo[];
}

export class TaskGenerationReq {
    batch_job_id: string;

    @Optional()
    batch_priority: number;

    @Optional()
    batch_type: string;


    tasks: Task[];

    @Optional()
    batch_frequency: number;
}

export class TaskGenerationRes {
    batch_job_id: string;
    status: string;
}
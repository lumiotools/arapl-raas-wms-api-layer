


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
    cargo_type?: string; 
    cargo_dimension?: Dimension;
    cargo_attributes?: Attribute;
    cargo_weight?: number;
}

export class Wait{
    wait_type: string;
    start_location_wait_time: number;
    end_location_wait_time?: number;
}

export class Location {
    location_id: string;
    location_action: string;
    location_dimension: Dimension;
    location_attribute?: Attribute ;
}

export class Task {
    task_id: string;
    task_dependency?: string;
    start_location: Location;
    end_location: Location;
    wait_time?: Wait;
    cargos: Cargo[];
}

export class TaskGenerationReq {
    batch_job_id: string;
    batch_priority?: number;
    batch_type?: string;
    tasks: Task[];
    batch_frequency?: number;
}

export class TaskGenerationRes {
    batch_job_id: string;
    status: string;
}
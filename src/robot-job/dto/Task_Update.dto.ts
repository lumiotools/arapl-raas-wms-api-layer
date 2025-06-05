import { Dimension, Wait } from "./Task_Generation.dto";

export class Cargo{
    cargo_code: string;
    cargo_dimension: Dimension;
    cargo_quantity?: number;
    cargo_weight?: number;
}

export class Location {
    location_id: string;
    location_dimension: Dimension;
    cargo_quantity?: number;
}

export class Task {
    task_id: string;
    task_dependency?: string;
    start_location: Location;
    end_location: Location;
    wait_time?: Wait;
    cargos: Cargo[];
}

export class TaskUpdateReq {
    batch_job_id: string;
    updates: Task[];
    timestamp?: string;
}

export class TaskUpdateRes {
    task_id: string;
    status: string;
    updated_at: string;
    message: string;
}
import { Optional } from "@nestjs/common";
import { Attribute, Dimension, Wait } from "./Task_Generation.dto";

export class Cargo{
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
    task_id: string;

    @Optional()
    task_dependency: string;

    start_location: Location;
    end_location: Location;

    @Optional()
    wait_time: Wait;

    cargos: Cargo[];
}

export class TaskUpdateReq {
    batch_job_id: string;
    updates: Task[];

    @Optional()
    timestamp: string;
}

export class TaskUpdateRes {
    task_id: string;
    status: string;
    updated_at: string;
    message: string;
}
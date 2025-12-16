
import { BadRequestException, HttpException } from "@nestjs/common";
import {authenticate} from "./authentication";
import { TaskGenerationReq, TaskGenerationRes, TaskType } from "src/modules/robot-job/dto/Task_Generation.dto";
import { Task } from "src/modules/robot-job/entities/task.entity";
import { INTEGRATION_URL } from "src/constants/integrations";

interface struct_fms_create_task {
    warehouse_id: string
    batch_job_id: string,
    batch_priority?: number,
    batch_type?: string,
    batch_frequency?: number,
    tasks: Task[]
}

export async function createTask(payload: struct_fms_create_task): Promise<TaskGenerationRes> {
    try{
        // const Token = await authenticate();
        const RequestBody = {
            batch_job_id: payload.batch_job_id,
            batch_priority: payload.batch_priority,
            batch_type: payload.batch_type,
            batch_frequency: payload.batch_frequency,
            tasks: payload.tasks.map(task => ({
                task_id: task.task_id,
                task_type: task.task_type,
                task_dependency: task.task_dependency,
                robot_id: task.robot_id,
                start_location: {
                    location_id: task.start_location.location_id,
                    location_type: task.start_location.location_type,
                    location_action: task.start_location.location_action,
                },
                end_location: {
                    location_id: task.end_location.location_id,
                    location_type: task.end_location.location_type,
                    location_action: task.end_location.location_action,
                },
                cargos: task.cargos?.map(cargo => ({
                    cargo_code: cargo.cargo_code,
                })) ?? [],
            })),
        }
        // let URL = process.env.FMS_BASE_URL;
        let URL = INTEGRATION_URL[payload.tasks[0].task_type];
        if (!URL) {
        throw new BadRequestException('Invalid task type specified');
        }
        const response = await fetch(`${URL}/wms-integration-wrapper/${payload.warehouse_id}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(RequestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                parsed.message = parsed.message.replace("\n", ", ");
                // If the integration already returns a structured error, preserve it and status
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                // Not JSON, throw as plain bad request
                throw new BadRequestException(errorText);
            }
        }

        return await response.json();

    } catch (error) {
        // If it's already an HttpException (we rethrew above), propagate it as-is
        if (error instanceof HttpException) throw error;
        throw new BadRequestException(error.message);
    }
}
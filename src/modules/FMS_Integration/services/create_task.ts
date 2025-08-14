
import {authenticate} from "./authentication";
import fetch from 'node-fetch';
import { TaskGenerationReq, TaskGenerationRes } from "src/modules/robot-job/dto/Task_Generation.dto";
import { Task } from "src/modules/robot-job/entities/task.entity";

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
        const Token = await authenticate();
        const RequestBody = {
            batch_job_id: payload.batch_job_id,
            batch_priority: payload.batch_priority,
            batch_type: payload.batch_type,
            batch_frequency: payload.batch_frequency,
            tasks: payload.tasks.map(task => ({
                task_id: task.task_id,
                task_type:task.task_type,
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
                }
            })),
        }
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/${payload.warehouse_id}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(RequestBody)
        });
        console.log("token: ",Token);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create task: ${response.status} ${errorText}`);
        }

        return await response.json();
            
    }
    catch (error) {
        console.error('Error during create-task:', error);
        throw new Error('Create task failed');
    }
}
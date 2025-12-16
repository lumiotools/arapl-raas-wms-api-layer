
import { BadRequestException, HttpException } from "@nestjs/common";
import {authenticate} from "./authentication";
import { TaskGenerationReq, TaskGenerationRes } from "src/modules/robot-job/dto/Task_Generation.dto";
import { Task } from "src/modules/robot-job/entities/task.entity";
import { TaskUpdateRes } from "src/modules/robot-job/dto/Task_Update.dto";

interface update_payload {
    warehouse_id: string,
    batch_job_id: string,
    updates:Task[],
    timestamp?: string
}

export async function updateTask(payload: update_payload): Promise<TaskUpdateRes> {
    try{
        const Token = await authenticate();
        const RequestBody = {
            batch_job_id: payload.batch_job_id,
            updates: payload.updates,
        }
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/${payload.warehouse_id}/tasks`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(RequestBody)
        });
        console.log(`Request Body: ${JSON.stringify(RequestBody)}`);
        console.log("token: ",Token);
        console.log(`response: ${JSON.stringify(response)}`);
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                throw new BadRequestException(`Failed to update task: ${response.status} ${errorText}`);
            }
        }

        return await response.json();

    } catch (error) {
        console.error('Error during update-task:', error);
        if (error instanceof HttpException) throw error;
        throw new BadRequestException('FMS Update task failed');
    }
}
           
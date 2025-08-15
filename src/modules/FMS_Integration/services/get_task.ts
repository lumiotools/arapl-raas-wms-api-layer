
import { BadRequestException } from "@nestjs/common";
import fetch from 'node-fetch';
import { Task } from "src/modules/robot-job/entities/task.entity";

interface getTasks{
    warehouse_id: string,
    batch_job_id: string
}

export async function get_tasks(payload: getTasks): Promise<Task[]> {
    try{
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to get tasks: ${response.status} ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error during get-tasks:', error);
        throw new BadRequestException('FMS Get tasks failed');
    }
}
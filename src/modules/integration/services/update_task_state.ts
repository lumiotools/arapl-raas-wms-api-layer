import { BadRequestException } from "@nestjs/common";

interface UpdateTaskStatePayload {
    warehouse_id: string;
    batch_job_id: string;
    task_id: string;
    action: 'pause' | 'resume';
}

interface UpdateTaskStateResponse {
    success: boolean;
    message: string;
    taskId: string;
}

export async function updateTaskState(payload: UpdateTaskStatePayload): Promise<UpdateTaskStateResponse> {
    try {
        const URL = process.env.FMS_BASE_URL;
        const endpoint = `${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}/${payload.task_id}/state`;
        
        console.log(`Update Task State URL: ${endpoint}`);
        console.log(`Action: ${payload.action}`);

        const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: payload.action })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to update task state: ${response.status} ${errorText}`);
        }

        const responseData = await response.json();
        console.log(`Update Task State Response: ${JSON.stringify(responseData)}`);
        return responseData as UpdateTaskStateResponse;

    } catch (error) {
        console.error('Error during update-task-state:', error);
        throw new BadRequestException(`FMS Update task state failed: ${error.message}`);
    }
}

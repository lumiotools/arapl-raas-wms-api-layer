import { BadRequestException, HttpException } from "@nestjs/common";

interface UpdateTaskStatePayload {
    warehouse_id: string;
    batch_job_id: string;
    task_id: string;
    action: 'pause' | 'resume' | 'cancel&retry';
    new_task_id?: string;
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

        const requestBody: any = { action: payload.action };
        if (payload.new_task_id) {
            requestBody.new_task_id = payload.new_task_id;
        }

        const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                throw new BadRequestException(`Failed to update task state: ${response.status} ${errorText}`);
            }
        }

        const responseData = await response.json();
        console.log(`Update Task State Response: ${JSON.stringify(responseData)}`);
        return responseData as UpdateTaskStateResponse;

    } catch (error) {
        console.error('Error during update-task-state:', error);
        if (error instanceof HttpException) throw error;
        throw new BadRequestException(`FMS Update task state failed: ${error.message}`);
    }
}


import { BadRequestException, HttpException } from "@nestjs/common";
import {authenticate} from "./authentication";
import { TaskGenerationReq, TaskGenerationRes } from "src/modules/robot-job/dto/Task_Generation.dto";
import { Task } from "src/modules/robot-job/entities/task.entity";
import { CancelBatchReq} from "src/modules/robot-job/dto/Cancel.dto";

interface CancelBatch {
    warehouse_id: string;
    batch_job_id: string;
    cancel_req: CancelBatchReq;
    task_id?: string;
}

export async function cancelBatch(payload: CancelBatch): Promise<TaskGenerationRes> {
    try{
        // const Token = await authenticate();
        let URL = process.env.FMS_BASE_URL;
        console.log(`Cancel Batch URL: ${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}/cancel`);
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}/cancel`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(payload.cancel_req)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                throw new BadRequestException(`Failed to cancel batch: ${response.status} ${errorText}`);
            }
        }

        const responseData = await response.json();
        console.log(`response: ${JSON.stringify(responseData)}`);
        return responseData;

    } catch (error) {
        console.error('Error during cancel-batch:', error);
        if (error instanceof HttpException) throw error;
        throw new BadRequestException('FMS Cancel batch failed');
    }
}


export async function cancelBatchTask(payload: CancelBatch): Promise<TaskGenerationRes> {
    try{
        // const Token = await authenticate();
        let URL = process.env.FMS_BASE_URL;
        console.log(`Cancel Batch URL: ${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}/${payload.task_id}/cancel`);
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}/${payload.task_id}/cancel`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(payload.cancel_req)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                throw new BadRequestException(`Failed to cancel batch: ${response.status} ${errorText}`);
            }
        }

        const responseData = await response.json();
        console.log(`response: ${JSON.stringify(responseData)}`);
        return responseData;

    } catch (error) {
        console.error('Error during cancel-batch:', error);
        if (error instanceof HttpException) throw error;
        throw new BadRequestException('FMS Cancel batch failed');
    }
}
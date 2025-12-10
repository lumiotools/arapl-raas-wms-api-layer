import { BadRequestException } from "@nestjs/common";
import { PauseResumeReq, PauseResumeRes } from "src/modules/robot-job/dto/PauseResume.dto";

export async function pause_resume_task(warehouseId: string, batchId: string, taskId: string, pauseResumeReq: PauseResumeReq): Promise<PauseResumeRes> {
    try {
        console.log('calling pause_resume_task')
        let URL = process.env.FMS_BASE_URL;
        const requestBody = {
            action: pauseResumeReq.action
        };
        console.log('Request Body:', JSON.stringify(requestBody)); // Debugging line to check the request body
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${warehouseId}/tasks/${batchId}/${taskId}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to pause or resume task: ${response.status} ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error during pause_resume_task:', error);
        throw new BadRequestException('FMS pause or resume task failed');
    }
}
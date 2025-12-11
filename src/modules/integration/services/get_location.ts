
import { BadRequestException } from "@nestjs/common";
import { GetLocationReq, GetLocationRes } from "src/modules/robot-job/dto/GetLocation.dto";
import { Task } from "src/modules/robot-job/entities/task.entity";


export async function get_location(payload: GetLocationReq): Promise<GetLocationRes> {
    try{
        console.log('calling getlocation')
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.warehouse_id}/locations?location_status=${payload.location_status}&location_zone=${payload.location_zone}&location_type=${payload.location_type}&location_level=${payload.location_level}&location_limit=${payload.location_limit}`);
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
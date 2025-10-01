import { BadRequestException } from "@nestjs/common";
import fetch from 'node-fetch';


export async function update_location_status(warehouseId:string, locationId:string, status:string) {
    try{
        console.log('calling update_location_status')
        let URL = process.env.FMS_BASE_URL;
        const requestBody = {
            location_id: locationId,
            status: status
        };
        console.log('Request Body:', JSON.stringify(requestBody)); // Debugging line to check the request body
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/${warehouseId}/locations/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to update location status: ${response.status} ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error during update_location_status:', error);
        throw new BadRequestException('FMS Update location status failed');
    }
}
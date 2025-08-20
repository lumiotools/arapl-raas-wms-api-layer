
import { BadRequestException } from "@nestjs/common";
import fetch from 'node-fetch';

export async function get_idle_robots(): Promise<any[]> {
    try{
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/robot-job/idle-robots`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to get idle robots: ${response.status} ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error during get-idle robots:', error);
        throw new BadRequestException('FMS Get idle robots failed');
    }
}
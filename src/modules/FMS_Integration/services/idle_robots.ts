
import { BadRequestException } from "@nestjs/common";
import fetch from 'node-fetch';

export async function get_idle_robots(): Promise<any[]> {
    try{
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/wms-integration/idle-robots`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(`Failed to get idle robots: ${response.status} ${errorText}`);
        }

        const res = await response.json();
        console.log(`res: ${JSON.stringify(res)}`);
        const returnRes: any[] = [];
        for (const robot of res.data) {
            // if (['MAIA-003','MAIA-004','MAIA-005'].includes(robot.name)) continue; // Filter out test robots
            returnRes.push({
                id: robot.robot_id,
                status: robot.status,
            });
        }
        return returnRes;
    } catch (error) {
        console.error('Error during get-idle robots:', error);
        throw new BadRequestException('FMS Get idle robots failed');
    }
}
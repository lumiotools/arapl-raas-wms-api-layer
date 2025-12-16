
import { BadRequestException, HttpException } from "@nestjs/common";

export async function get_idle_robots(): Promise<any[]> {
    try{
        let URL = process.env.FMS_BASE_URL;
        const response = await fetch(`${URL}/wms-integration-wrapper/wms-integration/idle-robots`);
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const parsed = JSON.parse(errorText);
                const status = parsed.statusCode ?? response.status ?? 400;
                throw new HttpException(parsed, status);
            } catch (e) {
                if (e instanceof HttpException) throw e;
                throw new BadRequestException(`Failed to get idle robots: ${response.status} ${errorText}`);
            }
        }

        const res = await response.json();
        console.log(`res: ${JSON.stringify(res)}`);
        const returnRes: any[] = [];
        for (const robot of res.data) {
            returnRes.push({
                id: robot.robot_id,
                status: robot.status,
            });
        }
        return returnRes;
    } catch (error) {
        console.error('Error during get-idle robots:', error);
        if (error instanceof HttpException) throw error;
        throw new BadRequestException('FMS Get idle robots failed');
    }
}
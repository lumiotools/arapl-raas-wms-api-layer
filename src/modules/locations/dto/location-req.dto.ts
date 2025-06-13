import { LocationAction } from '../../robot-job/dto/Task_Generation.dto';
import { Location } from '../../robot-job/dto/Task_Generation.dto';

export class GetLocationReq{
    zone_id: string;
    location_type: LocationAction;
}

export class GetLocationRes {
    zone_id: string;
    available_location_types: Location[];
}

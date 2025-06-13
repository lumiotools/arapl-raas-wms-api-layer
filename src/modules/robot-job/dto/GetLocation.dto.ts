import { LocationAction } from './Task_Generation.dto'
import { Location } from './Task_Generation.dto';


export class GetLocationReq{
    zone_id: string;
    location_type: LocationAction;
}

export class GetLocationRes {
    zone_id: string;
    available_location_types: Location[];
}
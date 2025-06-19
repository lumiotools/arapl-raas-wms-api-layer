import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { LocationAction } from './Task_Generation.dto'
import { Location } from './Task_Generation.dto';

export enum LocationStatus {
    All = 'All',
    Occupied = 'Occupied',
    Empty = 'Empty'
}

export enum LocationType{
    Pallet = 'Pallet',
    BaleClampBox = 'BaleClampBox'
}

export class GetLocationReq{
    @IsOptional()
    @IsEnum(LocationStatus)
    location_status: LocationStatus = LocationStatus.All;

    @IsOptional()
    location_zone: string;

    @IsOptional()
    @IsEnum(LocationType)
    location_type: LocationType;

    @IsOptional()
    location_level : string = 'All';

    @IsOptional()
    location_limit: number;

}

export class GetLocationRes {
    @IsNotEmpty()
    zone_id: string;

    @IsNotEmpty()
    available_location_types: Location[];
}
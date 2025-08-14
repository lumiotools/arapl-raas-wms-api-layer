// import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
// import { LocationAction } from './Task_Generation.dto'
// import { Location } from './Task_Generation.dto';

// export enum LocationStatus {
//     All = 'All',
//     Occupied = 'Occupied',
//     Empty = 'Empty'
// }

// export enum LocationType{
//     Pallet = 'Pallet',
//     BaleClampBox = 'BaleClampBox'
// }

// export class GetLocationReq{
//     @IsOptional()
//     @IsEnum(LocationStatus)
//     location_status: LocationStatus = LocationStatus.All;

//     @IsOptional()
//     location_zone: string;

//     @IsOptional()
//     @IsEnum(LocationType)
//     location_type: LocationType;

//     @IsOptional()
//     location_level : string = 'All';

//     @IsOptional()
//     location_limit: number;

// }

// export class GetLocationRes {
//     @IsNotEmpty()
//     zone_id: string;

//     @IsNotEmpty()
//     available_location_types: Location[];
// }

import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Dimension, LocationAction } from './Task_Generation.dto';
import { Type } from 'class-transformer';

export enum LocationStatus {
  All = 'All',
  Occupied = 'Occupied',
  Empty = 'Empty',
}

export enum LocationType {
  Pallet = 'Pallet',
  BaleClampBox = 'BaleClampBox',
}


export class Location {
  @ApiProperty({ example: 'LOC001' })
  @IsString()
  @IsNotEmpty()
  location_id: string;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  @IsNotEmpty()
  location_type: LocationType;

  @ApiProperty({ enum: LocationAction })
  @IsEnum(LocationAction)
  @IsNotEmpty()
  location_action: LocationAction;

  @ApiProperty({ type: Dimension })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Dimension)
  location_dimension: Dimension;
}

export class GetLocationReq {
  @ApiPropertyOptional({
    enum: LocationStatus,
    default: LocationStatus.All,
    description: 'Status filter for locations (e.g. All, Empty, Occupied)',
  })
  @IsOptional()
  @IsEnum(LocationStatus)
  location_status: LocationStatus = LocationStatus.All;

  @ApiPropertyOptional({
    description: 'Filter by warehouse ID',
    example: 'WH001',
  })
  @IsOptional()
  warehouse_id: string;

  @ApiPropertyOptional({
    description: 'Filter by location zone ID',
    example: 'ZONE_A1',
  })
  @IsOptional()
  location_zone: string;

  @ApiPropertyOptional({
    enum: LocationType,
    description: 'Type of location (e.g. Pallet, BaleClampBox)',
  })
  @IsOptional()
  @IsEnum(LocationType)
  location_type: LocationType;

  @ApiPropertyOptional({
    description: 'Level of the location (defaults to All)',
    example: 'Level1',
    default: 'All',
  })
  @IsOptional()
  location_level: string = 'All';

  @ApiPropertyOptional({
    description: 'Limit number of locations returned',
    example: 10,
  })
  @IsOptional()
  location_limit: number;
}

export class GetLocationRes {
  @ApiProperty({
    description: 'Zone ID of the returned locations',
    example: 'ZONE_A1',
  })
  @IsNotEmpty()
  zone_id: string;

  @ApiProperty({
    description: 'List of available locations in the zone',
    type: [Location],
  })
  @IsNotEmpty()
  available_location_types: Location[];
}

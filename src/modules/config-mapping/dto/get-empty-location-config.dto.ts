import {
  IsString,
  IsNumber,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Primitive config DTOs
export class StringConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

export class NumberConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

// Request Body DTO
export class GetEmptyLocationRequestBodyDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_status: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_zone: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_type: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_level: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  location_limit: NumberConfigDto;
}

// Request DTO
export class GetEmptyLocationRequestDto {
  @ValidateNested()
  @Type(() => GetEmptyLocationRequestBodyDto)
  body: GetEmptyLocationRequestBodyDto;

  @IsObject()
  query_params: Record<string, string>;

  @IsObject()
  path_params: Record<string, string>;
}

// Nested Number Wrapper DTO for location_dimension
export class NumberWrapperDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  length?: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  width?: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  height?: NumberConfigDto;
}

// Updated Location Dimension DTO
export class GetEmptyLocationDimensionDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => NumberWrapperDto)
  length: NumberWrapperDto;

  @ValidateNested()
  @Type(() => NumberWrapperDto)
  width: NumberWrapperDto;

  @ValidateNested()
  @Type(() => NumberWrapperDto)
  height: NumberWrapperDto;
}

// Available Location Map DTO
export class GetEmptyLocationAvailableLocationMapDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_id: StringConfigDto;

  @ValidateNested()
  @Type(() => GetEmptyLocationDimensionDto)
  location_dimension: GetEmptyLocationDimensionDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_type: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  cargo_quantity: NumberConfigDto;
}

// Available Locations Array DTO
export class GetEmptyLocationAvailableLocationsArrayDto {
  @IsString()
  object_type: string;
  @IsString()
  source: string;
  @ValidateNested()
  @Type(() => GetEmptyLocationAvailableLocationMapDto)
  map: GetEmptyLocationAvailableLocationMapDto;
}

// Response Body DTO
export class GetEmptyLocationResponseBodyDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => StringConfigDto)
  zone_id: StringConfigDto;

  @ValidateNested()
  @Type(() => GetEmptyLocationAvailableLocationsArrayDto)
  available_locations: GetEmptyLocationAvailableLocationsArrayDto;
}

// Response DTO
export class GetEmptyLocationResponseDto {
  @ValidateNested()
  @Type(() => GetEmptyLocationResponseBodyDto)
  body: GetEmptyLocationResponseBodyDto;
}

// Endpoint DTO
export class GetEmptyLocationEndpointDto {
  @IsString()
  url: string;
  @IsString()
  method: string;
  @IsObject()
  headers: Record<string, string>;
}

// Root DTO
export class GetEmptyLocationConfigRootDto {
  @ValidateNested()
  @Type(() => GetEmptyLocationEndpointDto)
  endpoint: GetEmptyLocationEndpointDto;

  @ValidateNested()
  @Type(() => GetEmptyLocationRequestDto)
  request: GetEmptyLocationRequestDto;

  @ValidateNested()
  @Type(() => GetEmptyLocationResponseDto)
  response: GetEmptyLocationResponseDto;
}

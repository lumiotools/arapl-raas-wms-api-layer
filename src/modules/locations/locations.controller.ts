import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { GetLocationReq, GetLocationRes } from './dto/location-req.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('/get_empty_locations')
  async getEmptyLocations(
    @Body() getLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
    return await this.locationsService.getEmptyLocations(
      getLocationReq,
    );
  }

  @Post('/get-strp-drop-locations/:requiredLocations')
  async getStrpDropLocations(
    @Param('requiredLocations') requiredLocations: string,
  ): Promise<GetLocationRes> {
    const location = Number(requiredLocations);
    if (isNaN(location) || location <= 0) {
      throw new BadRequestException('Invalid number of required location.');
    }
    return await this.locationsService.getStrpDropLocations(
      location,
    );
  }
}

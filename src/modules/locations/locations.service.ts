import { Injectable } from '@nestjs/common';
import { GetLocationReq, GetLocationRes } from './dto/location-req.dto';
import { Location } from '../robot-job/entities/locations.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationAction } from '../robot-job/dto/Task_Generation.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,
  ) {}

  async getEmptyLocations(
    getLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
    const locations = await this.LocationRepository.find({
      where: {
        location_zone: getLocationReq.zone_id,
        location_action: getLocationReq.location_type,
        isEmpty: true,
      },
    });

    if (locations.length === 0) {
      return {
        zone_id: getLocationReq.zone_id,
        available_location_types: [],
      };
    }

    if (getLocationReq.location_type === 'Drop') {
      locations.sort((a, b) => (a.dropPriority ?? 0) - (b.dropPriority ?? 0));
    } else if (getLocationReq.location_type === 'Pick') {
      locations.sort(
        (a, b) => (a.pickupPriority ?? 0) - (b.pickupPriority ?? 0),
      );
    }
    return {
      zone_id: getLocationReq.zone_id,
      available_location_types: locations,
    };
  }

  async getStrpDropLocations(
      location: number,
    ): Promise<GetLocationRes> {
      // Find all locations with isEmpty=true and location_action='Drop'
      const allLocations = await this.LocationRepository.find({
        where: {
          isEmpty: true,
          location_action: LocationAction.Drop,
        },
      });
  
      const zoneMap: Record<string, Location[]> = {};
      for (const loc of allLocations) {
        if (!zoneMap[loc.location_zone]) {
          zoneMap[loc.location_zone] = [];
        }
        zoneMap[loc.location_zone].push(loc);
      }
  
      // Find a zone with at least 'location' number of available locations
      let selectedZoneId: string | null = null;
      let selectedLocations: Location[] = [];
      for (const [zoneId, locs] of Object.entries(zoneMap)) {
        if (locs.length >= location) {
          selectedZoneId = zoneId;
          selectedLocations = locs;
          break;
        }
      }
  
      if (!selectedZoneId) {
        return {
          zone_id: '',
          available_location_types: [],
        };
      }
  
      // Sort locations by dropPriority in ascending order before returning
      selectedLocations.sort(
        (a, b) => (a.dropPriority ?? 0) - (b.dropPriority ?? 0),
      );
      return {
        zone_id: selectedZoneId,
        available_location_types: selectedLocations,
      };
    }
}

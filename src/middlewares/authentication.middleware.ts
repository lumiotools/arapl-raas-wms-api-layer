import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../modules/robot-job/entities/warehouse.entity';

// Extend the Request interface to include warehouse and configs
declare global {
  namespace Express {
    interface Request {
      warehouse?: Warehouse;
      warehouseId?: string;
      taskConfigs?: {
        create_task?: any;
        update_task?: any;
        cancel_task?: any;
        get_location?: any;
      };
    }
  }
}

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract authentication token from headers
      const token = req.headers.authorization;
      console.log('Auth Header:', token);
      if (!token) {
        throw new UnauthorizedException('Authorization token is required');
      }

      // Extract warehouse ID from token, headers, or query params
      // Option 1: From path parameter, then header, then query, then token
      const warehouseId = (req.params && req.params.warehouse_id) as string;

      if (!warehouseId) {
        throw new UnauthorizedException('Warehouse ID is required');
      }

      // Validate warehouse exists and is active - now including config fields
      const warehouse = await this.warehouseRepository.findOne({
        where: {
          warehouse_id: warehouseId,
          // Add any additional conditions like isActive: true
        },
        select: [
          'warehouse_id',
          'warehouse_name',
          'api_key',
          'locations_customer_managed',
          'create_task_config',
          'update_task_config',
          'cancel_task_config',
          'get_location_config',
        ],
      });

      if (!warehouse) {
        throw new UnauthorizedException(
          'Invalid warehouse or warehouse not found',
        );
      }

      // Validate the token against the warehouse
      // This depends on your authentication strategy
      const isValidToken = token === warehouse.api_key;
      if (!isValidToken) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Attach warehouse to request object for use in controllers
      req.warehouse = warehouse;
      req.warehouseId = warehouseId;

      // Attach task configurations for easy access
      req.taskConfigs = {
        create_task: warehouse.create_task_config,
        update_task: warehouse.update_task_config,
        cancel_task: warehouse.cancel_task_config,
        get_location: warehouse.get_location_config,
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

import { Injectable, NestMiddleware, UnauthorizedException, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../modules/robot-job/entities/warehouse.entity';

// Extend the Request interface to include warehouse
declare global {
  namespace Express {
    interface Request {
      warehouse?: Warehouse;
      warehouseId?: string;
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
      const authHeader = req.headers.authorization;
      console.log('Auth Header:', authHeader);
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Authorization token is required');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Extract warehouse ID from token, headers, or query params
      // Option 1: From path parameter, then header, then query, then token
      const warehouseId = (req.params && req.params.warehouse_id) as string ||
             req.headers['x-warehouse-id'] as string ||
             req.query.warehouseId as string ||
             this.extractWarehouseFromToken(token);

      if (!warehouseId) {
        throw new UnauthorizedException('Warehouse ID is required');
      }

      // Validate warehouse exists and is active
      const warehouse = await this.warehouseRepository.findOne({
        where: { 
          warehouse_id: warehouseId,
          // Add any additional conditions like isActive: true
        }
      });

      if (!warehouse) {
        throw new UnauthorizedException('Invalid warehouse or warehouse not found');
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

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractWarehouseFromToken(token: string): string | null {
    try {
      // If using JWT, decode and extract warehouse ID
      // This is a simple example - use proper JWT library in production
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.warehouseId || payload.warehouse_id || null;
    } catch {
      return null;
    }
  }
}
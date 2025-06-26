import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['version'];
    const requiredVersion = this.configService.get<string>(
      'REQUIRED_VERSION',
      '2.1.3',
    );

    if (version && version === requiredVersion) {
      next();
    } else {
      throw new BadRequestException('Version unavailable');
    }
  }
}

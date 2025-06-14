import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { REQUIRED_VERSION } from 'src/config/auth.config';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['version'];

    if (version && version === REQUIRED_VERSION) {
      next();
    } else {
      throw new HttpException('Version unavailable', HttpStatus.BAD_REQUEST);
    }
  }
}

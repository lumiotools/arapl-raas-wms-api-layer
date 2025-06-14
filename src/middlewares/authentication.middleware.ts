import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SECRET_TOKEN } from 'src/config/auth.config';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization'];

    if (token && token === SECRET_TOKEN) {
      next();
    } else {
      throw new ForbiddenException('Unauthorized');
    }
  }
}

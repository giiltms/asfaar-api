import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';

@Injectable()
export class LargePayloadMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply larger body size limits specifically for biometric endpoints
    if (req.path.includes('/biometric-capture/')) {
      express.json({ limit: '100mb' })(req, res, next);
    } else {
      next();
    }
  }
}

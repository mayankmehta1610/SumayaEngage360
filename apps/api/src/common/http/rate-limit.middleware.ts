import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// NFR-003/014: basic in-memory rate limiting per IP+tenant.
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly hits = new Map<string, { count: number; reset: number }>();
  private readonly windowMs = 60_000;
  private readonly max = 300;

  use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${(req as any).tenantId ?? 'platform'}:${req.path}`;
    const now = Date.now();
    const cur = this.hits.get(key);
    if (!cur || now > cur.reset) {
      this.hits.set(key, { count: 1, reset: now + this.windowMs });
      return next();
    }
    cur.count += 1;
    if (cur.count > this.max) {
      throw new HttpException(
        { statusCode: 429, message: 'Rate limit exceeded', error: 'Too Many Requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    next();
  }
}

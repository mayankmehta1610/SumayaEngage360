import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// NFR-012: correlation IDs on every request/response for observability.
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-correlation-id'] as string | undefined;
    const id = incoming?.trim() || randomUUID();
    (req as any).correlationId = id;
    res.setHeader('x-correlation-id', id);
    next();
  }
}

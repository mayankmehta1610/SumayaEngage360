import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// NFR-014: idempotent POST/PUT via Idempotency-Key header.
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) return next();

    const tenantId = (req as any).tenantId as string | undefined;
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId: tenantId ?? '', key } },
    });
    if (existing?.response) {
      res.status(existing.statusCode ?? 200).json(existing.response);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      void this.prisma.idempotencyKey.create({
        data: {
          tenantId,
          userId: (req as any).user?.sub,
          key,
          method: req.method,
          path: req.path,
          response: body as Prisma.InputJsonValue,
          statusCode: res.statusCode,
          expiresAt: new Date(Date.now() + 24 * 3600_000),
        },
      }).catch(() => { /* duplicate key race */ });
      return originalJson(body);
    };
    next();
  }
}

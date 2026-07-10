import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Resolves the tenant for every request:
//  - production: subdomain of the request host (acme.engage360.com)
//  - development / API clients: x-tenant-id header (tenant id or subdomain)
// Platform-admin routes work without a tenant.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers['x-tenant-id'] as string | undefined;
    let key = header?.trim();

    if (!key) {
      const host = req.hostname ?? '';
      const parts = host.split('.');
      // acme.engage360.com -> "acme"; localhost / bare domains have no subdomain
      if (parts.length > 2) key = parts[0];
    }

    if (key) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          OR: [{ id: key }, { subdomain: key }],
          isActive: true,
        },
        select: { id: true, subdomain: true, country: true },
      });
      if (tenant) {
        (req as any).tenant = tenant;
        (req as any).tenantId = tenant.id;
      }
    }
    next();
  }
}

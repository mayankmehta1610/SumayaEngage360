import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId ?? undefined,
        userId: entry.userId ?? undefined,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? undefined,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress ?? undefined,
      },
    });
  }

  async list(
    tenantId: string,
    opts: {
      entityType?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (opts.entityType) where.entityType = opts.entityType;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lte = opts.to;
    }
    const orderBy = { createdAt: 'desc' as const };
    const paginated = opts.page !== undefined || opts.pageSize !== undefined;
    if (!paginated) {
      return this.prisma.auditLog.findMany({
        where,
        orderBy,
        take: opts.limit ?? 200,
      });
    }
    const p = Math.max(1, opts.page ?? 1);
    const ps = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data,
      meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) || 1 },
    };
  }
}

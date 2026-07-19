import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
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
        userAgent: entry.userAgent ?? undefined,
        deviceType: entry.deviceType ?? undefined,
      },
    });
  }

  async list(
    tenantId: string,
    opts: {
      entityType?: string;
      entityTypes?: string[];
      from?: Date;
      to?: Date;
      limit?: number;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDir?: string;
      filter?: string;
    } = {},
  ) {
    const filters = parseFilterJson(opts.filter);
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (opts.entityTypes?.length) {
      where.entityType = opts.entityTypes.length === 1
        ? opts.entityTypes[0]
        : { in: opts.entityTypes };
    } else if (opts.entityType) where.entityType = opts.entityType;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lte = opts.to;
    }
    if (filters.action) where.action = contains(filters.action);
    if (filters.entity) where.entityType = contains(filters.entity);
    if (filters.device) where.deviceType = contains(filters.device);
    if (filters.actor) {
      const actorIds = await this.userIdsByEmail(tenantId, filters.actor);
      where.userId = actorIds.length ? { in: actorIds } : { in: ['__none__'] };
    }
    if (filters.__search) {
      const q = filters.__search;
      const actorIds = await this.userIdsByEmail(tenantId, q);
      where.OR = [
        { action: contains(q) },
        { entityType: contains(q) },
        ...(actorIds.length ? [{ userId: { in: actorIds } }] : []),
      ];
    }
    const dir = parseSortDir(opts.sortDir);
    const orderBy: Prisma.AuditLogOrderByWithRelationInput = (() => {
      switch (opts.sortBy) {
        case 'actor': return { userId: dir };
        case 'action': return { action: dir };
        case 'entity': return { entityType: dir };
        case 'when': return { createdAt: dir };
        default: return { createdAt: dir };
      }
    })();
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
    return paginatedResponse(data, total, p, ps, opts.sortBy, dir);
  }

  private async userIdsByEmail(tenantId: string, needle: string): Promise<string[]> {
    const users = await this.prisma.users.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
        email: contains(needle),
      },
      select: { id: true },
      take: 200,
    });
    return users.map((u) => u.id);
  }
}

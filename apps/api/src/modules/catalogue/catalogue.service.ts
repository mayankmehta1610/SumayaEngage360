import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/http/pagination';

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  listEntities(opts: { domain?: string; implemented?: boolean; page?: number; pageSize?: number }) {
    const where: any = {};
    if (opts.domain) where.domain = opts.domain;
    if (opts.implemented !== undefined) where.implemented = opts.implemented;
    return this.prisma.dataEntityCatalogue.findMany({ where, orderBy: { entity: 'asc' } });
  }

  async listEntitiesPaginated(opts: {
    domain?: string;
    implemented?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<unknown>> {
    const all = await this.listEntities(opts);
    return paginate(all, opts.page, opts.pageSize);
  }

  getEntity(id: string) {
    return this.prisma.dataEntityCatalogue.findUnique({ where: { id } });
  }

  listApis(opts: { domain?: string; implemented?: boolean }) {
    const where: any = {};
    if (opts.domain) where.domain = opts.domain;
    if (opts.implemented !== undefined) where.implemented = opts.implemented;
    return this.prisma.apiCatalogueEntry.findMany({ where, orderBy: { id: 'asc' } });
  }

  async listApisPaginated(opts: {
    domain?: string;
    implemented?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const all = await this.listApis(opts);
    return paginate(all, opts.page, opts.pageSize);
  }

  getApi(id: string) {
    return this.prisma.apiCatalogueEntry.findUnique({ where: { id } });
  }
}

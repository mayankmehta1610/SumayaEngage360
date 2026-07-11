import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/http/pagination';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async features(opts: { domain?: string; status?: string; page?: number; pageSize?: number }) {
    const where: Prisma.FeatureCatalogueWhereInput = {};
    if (opts.domain) where.domain = opts.domain;
    if (opts.status) where.status = opts.status;
    const all = await this.prisma.featureCatalogue.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    return paginate(all, opts.page, opts.pageSize);
  }

  featureStats() {
    return this.prisma.featureCatalogue.groupBy({ by: ['status'], _count: true });
  }

  modules() {
    return this.prisma.moduleSummary.findMany({ orderBy: { id: 'asc' } });
  }

  roles() {
    return this.prisma.roleDefinition.findMany({ orderBy: { id: 'asc' } });
  }

  workflows() {
    return this.prisma.workflowDefinition.findMany({ orderBy: { id: 'asc' } });
  }

  async markFeature(id: string, status: string, cursorDone = true) {
    return this.prisma.featureCatalogue.update({
      where: { id },
      data: { status, cursorDone },
    });
  }

  overview() {
    return Promise.all([
      this.prisma.featureCatalogue.count(),
      this.prisma.featureCatalogue.count({ where: { status: 'Done' } }),
      this.prisma.moduleSummary.count(),
      this.prisma.roleDefinition.count(),
      this.prisma.workflowDefinition.count(),
      this.prisma.workflowDefinition.count({ where: { implemented: true } }),
    ]).then(([features, done, modules, roles, workflows, workflowsDone]) => ({
      sheets: {
        '01_Feature_Catalogue': { total: features, done },
        '02_Module_Summary': { domains: modules },
        '03_Roles': { roles },
        '04_Workflows': { total: workflows, implemented: workflowsDone },
      },
    }));
  }
}

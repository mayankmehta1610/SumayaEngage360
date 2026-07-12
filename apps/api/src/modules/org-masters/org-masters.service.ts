import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type MasterDto = { code: string; name: string; level?: number };

@Injectable()
export class OrgMastersService {
  constructor(private readonly prisma: PrismaService) {}

  private crud<T extends keyof PrismaService>(
    model: T,
    tenantId: string,
  ) {
    const m = this.prisma[model] as any;
    return {
      list: () => m.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }),
      create: (dto: MasterDto) => m.create({ data: { tenantId, ...dto } }),
    };
  }

  legalEntities(tenantId: string) { return this.crud('legalEntity', tenantId); }
  locations(tenantId: string) { return this.crud('location', tenantId); }
  businessUnits(tenantId: string) { return this.crud('businessUnit', tenantId); }
  costCenters(tenantId: string) { return this.crud('costCenter', tenantId); }
  grades(tenantId: string) { return this.crud('grade', tenantId); }
  employmentTypes(tenantId: string) { return this.crud('employmentType', tenantId); }

  async ensureDefaultEmploymentTypes(tenantId: string) {
    const count = await this.prisma.employmentType.count({ where: { tenantId } });
    if (count > 0) return;
    await this.prisma.employmentType.createMany({
      data: [
        { tenantId, code: 'FULL_TIME', name: 'Full time' },
        { tenantId, code: 'PART_TIME', name: 'Part time' },
        { tenantId, code: 'CONTRACT', name: 'Contract' },
      ],
    });
  }

  listHolidays(tenantId: string) {
    return this.prisma.holidayCalendar.findMany({ where: { tenantId, isActive: true } });
  }
  createHoliday(tenantId: string, dto: { name: string; year: number; holidays: unknown[] }) {
    return this.prisma.holidayCalendar.create({
      data: { tenantId, name: dto.name, year: dto.year, holidays: dto.holidays as any },
    });
  }

  listJd(tenantId: string) {
    return this.prisma.jdLibrary.findMany({ where: { tenantId, isActive: true } });
  }
  createJd(tenantId: string, dto: { title: string; body: string; tags?: string[] }) {
    return this.prisma.jdLibrary.create({ data: { tenantId, ...dto, tags: dto.tags ?? [] } });
  }
}

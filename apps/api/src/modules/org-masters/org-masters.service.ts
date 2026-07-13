import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type MasterDto = {
  code: string;
  name: string;
  level?: number;
  country?: string;
  taxId?: string;
  city?: string;
};

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
      update: async (id: string, dto: Partial<MasterDto>) => {
        const res = await m.updateMany({ where: { id, tenantId }, data: dto });
        if (res.count === 0) throw new NotFoundException('Record not found');
        return m.findFirst({ where: { id, tenantId } });
      },
      // Soft-delete: reference data is FK-referenced elsewhere, so deactivate.
      remove: async (id: string) => {
        const res = await m.updateMany({ where: { id, tenantId }, data: { isActive: false } });
        if (res.count === 0) throw new NotFoundException('Record not found');
        return { deactivated: true };
      },
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
  async updateHoliday(tenantId: string, id: string, dto: Partial<{ name: string; year: number; holidays: unknown[] }>) {
    const result = await this.prisma.holidayCalendar.updateMany({
      where: { id, tenantId },
      data: { ...dto, holidays: dto.holidays as any },
    });
    if (!result.count) throw new NotFoundException('Holiday calendar not found');
    return this.prisma.holidayCalendar.findFirst({ where: { id, tenantId } });
  }
  async removeHoliday(tenantId: string, id: string) {
    const result = await this.prisma.holidayCalendar.updateMany({ where: { id, tenantId }, data: { isActive: false } });
    if (!result.count) throw new NotFoundException('Holiday calendar not found');
    return { deactivated: true };
  }

  listJd(tenantId: string) {
    return this.prisma.jdLibrary.findMany({ where: { tenantId, isActive: true } });
  }
  createJd(tenantId: string, dto: { title: string; body: string; tags?: string[] }) {
    return this.prisma.jdLibrary.create({ data: { tenantId, ...dto, tags: dto.tags ?? [] } });
  }
  async updateJd(tenantId: string, id: string, dto: Partial<{ title: string; body: string; tags: string[] }>) {
    const result = await this.prisma.jdLibrary.updateMany({ where: { id, tenantId }, data: dto });
    if (!result.count) throw new NotFoundException('Job description not found');
    return this.prisma.jdLibrary.findFirst({ where: { id, tenantId } });
  }
  async removeJd(tenantId: string, id: string) {
    const result = await this.prisma.jdLibrary.updateMany({ where: { id, tenantId }, data: { isActive: false } });
    if (!result.count) throw new NotFoundException('Job description not found');
    return { deactivated: true };
  }
}

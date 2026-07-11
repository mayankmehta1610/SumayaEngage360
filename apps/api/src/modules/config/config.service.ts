import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  listAreas() {
    return this.prisma.configMasterArea.findMany({ orderBy: { id: 'asc' } });
  }

  listItems(tenantId: string) {
    return this.prisma.tenantConfigItem.findMany({
      where: { tenantId, effectiveTo: null },
      include: { area: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setItem(tenantId: string, areaId: string, key: string, value: Record<string, unknown>) {
    const prev = await this.prisma.tenantConfigItem.findFirst({
      where: { tenantId, areaId, key, effectiveTo: null },
    });
    if (prev) {
      await this.prisma.tenantConfigItem.update({
        where: { id: prev.id },
        data: { effectiveTo: new Date() },
      });
    }
    return this.prisma.tenantConfigItem.create({
      data: {
        tenantId,
        areaId,
        key,
        value: value as Prisma.InputJsonValue,
        version: (prev?.version ?? 0) + 1,
      },
    });
  }

  listBranches(tenantId: string) {
    return this.prisma.branch.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  createBranch(tenantId: string, dto: { code: string; name: string; country?: string }) {
    return this.prisma.branch.create({
      data: { tenantId, code: dto.code, name: dto.name, country: dto.country ?? 'IN' },
    });
  }

  listShifts(tenantId: string) {
    return this.prisma.shift.findMany({ where: { tenantId, isActive: true }, orderBy: { code: 'asc' } });
  }

  createShift(
    tenantId: string,
    dto: { code: string; name: string; startTime: string; endTime: string; graceMinutes?: number },
  ) {
    return this.prisma.shift.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        graceMinutes: dto.graceMinutes ?? 0,
      },
    });
  }

  listFlags(tenantId: string) {
    return this.prisma.featureFlag.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  createFlag(tenantId: string, dto: { code: string; name: string; enabled?: boolean }) {
    return this.prisma.featureFlag.create({
      data: { tenantId, code: dto.code, name: dto.name, enabled: dto.enabled ?? false },
    });
  }

  toggleFlag(tenantId: string, id: string, enabled: boolean) {
    return this.prisma.featureFlag.updateMany({
      where: { id, tenantId },
      data: { enabled },
    });
  }
}

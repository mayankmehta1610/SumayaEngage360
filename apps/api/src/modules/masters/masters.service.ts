import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService) {}

  listJobFamilies(tenantId: string) {
    return this.prisma.jobFamily.findMany({ where: { tenantId } });
  }
  createJobFamily(tenantId: string, body: { code: string; name: string }) {
    return this.prisma.jobFamily.create({ data: { tenantId, ...body } });
  }
  updateJobFamily(tenantId: string, id: string, body: Partial<{ code: string; name: string }>) {
    return this.prisma.jobFamily.update({ where: { id }, data: body });
  }

  listPositions(tenantId: string) {
    return this.prisma.orgPosition.findMany({ where: { tenantId } });
  }
  createPosition(tenantId: string, body: { code: string; title: string; familyId?: string }) {
    return this.prisma.orgPosition.create({ data: { tenantId, ...body } });
  }
  updatePosition(tenantId: string, id: string, body: Partial<{ code: string; title: string; familyId: string; isActive: boolean }>) {
    return this.prisma.orgPosition.update({ where: { id }, data: body });
  }

  listBgvPackages(tenantId: string) {
    return this.prisma.bgvPackage.findMany({ where: { tenantId } });
  }
  createBgvPackage(tenantId: string, body: { code: string; name: string; checks: unknown }) {
    return this.prisma.bgvPackage.create({ data: { tenantId, ...body, checks: body.checks as object } });
  }
  updateBgvPackage(tenantId: string, id: string, body: Partial<{ code: string; name: string; checks: unknown; isActive: boolean }>) {
    const data: Record<string, unknown> = { ...body };
    if (body.checks) data.checks = body.checks as object;
    return this.prisma.bgvPackage.update({ where: { id }, data });
  }

  listRatingScales(tenantId: string) {
    return this.prisma.ratingScale.findMany({ where: { tenantId } });
  }
  createRatingScale(tenantId: string, body: { name: string; levels: unknown }) {
    return this.prisma.ratingScale.create({ data: { tenantId, ...body, levels: body.levels as object } });
  }

  listCountryConfigs(tenantId: string) {
    return this.prisma.countryConfig.findMany({ where: { tenantId } });
  }
  createCountryConfig(tenantId: string, body: { country: string; settings: unknown }) {
    return this.prisma.countryConfig.create({ data: { tenantId, ...body, settings: body.settings as object } });
  }
  updateCountryConfig(tenantId: string, id: string, body: { settings: unknown }) {
    return this.prisma.countryConfig.update({ where: { id }, data: { settings: body.settings as object } });
  }

  listDocuments(tenantId: string) {
    return this.prisma.documentRepositoryItem.findMany({ where: { tenantId } });
  }
  createDocument(tenantId: string, body: { title: string; category: string; fileId?: string; tags?: string[] }) {
    return this.prisma.documentRepositoryItem.create({ data: { tenantId, ...body } });
  }

  listScheduledJobs(tenantId: string) {
    return this.prisma.scheduledJobDef.findMany({ where: { tenantId } });
  }
  createScheduledJob(tenantId: string, body: { name: string; cron: string; jobType: string; config?: unknown }) {
    return this.prisma.scheduledJobDef.create({
      data: { tenantId, ...body, config: body.config as object | undefined },
    });
  }

  listCheckIns(tenantId: string, employeeId?: string) {
    return this.prisma.performanceCheckIn.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  createCheckIn(tenantId: string, body: { employeeId: string; managerId?: string; notes: string; mood?: number }) {
    return this.prisma.performanceCheckIn.create({ data: { tenantId, ...body } });
  }

  listCalibrations(tenantId: string) {
    return this.prisma.calibrationSession.findMany({ where: { tenantId } });
  }
  createCalibration(tenantId: string, body: { name: string; cycleId?: string }) {
    return this.prisma.calibrationSession.create({ data: { tenantId, ...body } });
  }
  updateCalibration(tenantId: string, id: string, body: { status?: string; ratings?: unknown }) {
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.ratings) data.ratings = body.ratings as object;
    return this.prisma.calibrationSession.update({ where: { id }, data });
  }
}

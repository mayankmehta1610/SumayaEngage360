import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hard-delete a tenant-scoped row, mapping FK violations to a clear 409. */
  private async hardDelete(model: any, tenantId: string, id: string, label: string) {
    const existing = await model.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`${label} not found`);
    try {
      await model.delete({ where: { id } });
      return { deleted: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException(
          `${label} is in use and cannot be deleted. Deactivate or remove references first.`,
        );
      }
      throw e;
    }
  }

  /** Soft-delete (isActive=false) a tenant-scoped row. */
  private async softDelete(model: any, tenantId: string, id: string, label: string) {
    const res = await model.updateMany({ where: { id, tenantId }, data: { isActive: false } });
    if (res.count === 0) throw new NotFoundException(`${label} not found`);
    return { deactivated: true };
  }

  /** Tenant-scoped update: only touches rows owned by the tenant. */
  private async scopedUpdate(model: any, tenantId: string, id: string, data: any, label: string) {
    const res = await model.updateMany({ where: { id, tenantId }, data });
    if (res.count === 0) throw new NotFoundException(`${label} not found`);
    return model.findFirst({ where: { id, tenantId } });
  }

  // ── Job families ─────────────────────────────────────────────────────
  listJobFamilies(tenantId: string) {
    return this.prisma.jobFamily.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  createJobFamily(tenantId: string, body: { code: string; name: string }) {
    return this.prisma.jobFamily.create({ data: { tenantId, ...body } });
  }
  updateJobFamily(tenantId: string, id: string, body: Partial<{ code: string; name: string }>) {
    return this.scopedUpdate(this.prisma.jobFamily, tenantId, id, body, 'Job family');
  }
  deleteJobFamily(tenantId: string, id: string) {
    return this.hardDelete(this.prisma.jobFamily, tenantId, id, 'Job family');
  }

  // ── Positions ────────────────────────────────────────────────────────
  listPositions(tenantId: string) {
    return this.prisma.orgPosition.findMany({ where: { tenantId }, orderBy: { title: 'asc' } });
  }
  createPosition(tenantId: string, body: { code: string; title: string; familyId?: string }) {
    return this.prisma.orgPosition.create({ data: { tenantId, ...body } });
  }
  updatePosition(tenantId: string, id: string, body: Partial<{ code: string; title: string; familyId: string; isActive: boolean }>) {
    return this.scopedUpdate(this.prisma.orgPosition, tenantId, id, body, 'Position');
  }
  deletePosition(tenantId: string, id: string) {
    return this.softDelete(this.prisma.orgPosition, tenantId, id, 'Position');
  }

  // ── BGV packages ─────────────────────────────────────────────────────
  listBgvPackages(tenantId: string) {
    return this.prisma.bgvPackage.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  createBgvPackage(tenantId: string, body: { code: string; name: string; checks: unknown }) {
    return this.prisma.bgvPackage.create({ data: { tenantId, ...body, checks: body.checks as object } });
  }
  updateBgvPackage(tenantId: string, id: string, body: Partial<{ code: string; name: string; checks: unknown; isActive: boolean }>) {
    const data: Record<string, unknown> = { ...body };
    if (body.checks) data.checks = body.checks as object;
    return this.scopedUpdate(this.prisma.bgvPackage, tenantId, id, data, 'BGV package');
  }
  deleteBgvPackage(tenantId: string, id: string) {
    return this.softDelete(this.prisma.bgvPackage, tenantId, id, 'BGV package');
  }

  // ── Rating scales ────────────────────────────────────────────────────
  listRatingScales(tenantId: string) {
    return this.prisma.ratingScale.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  createRatingScale(tenantId: string, body: { name: string; levels: unknown }) {
    return this.prisma.ratingScale.create({ data: { tenantId, ...body, levels: body.levels as object } });
  }
  updateRatingScale(tenantId: string, id: string, body: Partial<{ name: string; levels: unknown }>) {
    const data: Record<string, unknown> = { ...body };
    if (body.levels) data.levels = body.levels as object;
    return this.scopedUpdate(this.prisma.ratingScale, tenantId, id, data, 'Rating scale');
  }
  deleteRatingScale(tenantId: string, id: string) {
    return this.hardDelete(this.prisma.ratingScale, tenantId, id, 'Rating scale');
  }

  // ── Country configs ──────────────────────────────────────────────────
  listCountryConfigs(tenantId: string) {
    return this.prisma.countryConfig.findMany({ where: { tenantId }, orderBy: { country: 'asc' } });
  }
  createCountryConfig(tenantId: string, body: { country: string; settings: unknown }) {
    return this.prisma.countryConfig.create({ data: { tenantId, ...body, settings: body.settings as object } });
  }
  updateCountryConfig(tenantId: string, id: string, body: { settings: unknown }) {
    return this.scopedUpdate(this.prisma.countryConfig, tenantId, id, { settings: body.settings as object }, 'Country config');
  }
  deleteCountryConfig(tenantId: string, id: string) {
    return this.hardDelete(this.prisma.countryConfig, tenantId, id, 'Country config');
  }

  // ── Document repository ──────────────────────────────────────────────
  listDocuments(tenantId: string) {
    return this.prisma.documentRepositoryItem.findMany({ where: { tenantId }, orderBy: { title: 'asc' } });
  }
  createDocument(tenantId: string, body: { title: string; category: string; fileId?: string; tags?: string[] }) {
    return this.prisma.documentRepositoryItem.create({ data: { tenantId, ...body } });
  }

  listScheduledJobs(tenantId: string) {
    return this.prisma.scheduledJobDef.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
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
    return this.scopedUpdate(this.prisma.calibrationSession, tenantId, id, data, 'Calibration');
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceCaseStatus, ComplianceCaseType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// POSH / whistleblower / disciplinary / incident case management with
// anonymous reporting, investigation assignment, legal hold and
// retention-policy driven purge previews.
@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  private strip(c: any) {
    // anonymous reporters are never exposed, even to HR
    const { reporterId, ...rest } = c;
    return c.anonymous ? { ...rest, reporterId: null } : c;
  }

  async report(
    tenantId: string,
    userId: string,
    dto: { type: ComplianceCaseType; title: string; details: string; anonymous?: boolean; subjectEmployeeId?: string },
  ) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    const row = await this.prisma.complianceCase.create({
      data: {
        tenantId,
        type: dto.type,
        title: dto.title,
        details: dto.details,
        anonymous: !!dto.anonymous,
        reporterId: emp?.id ?? null,
        subjectEmployeeId: dto.subjectEmployeeId,
      },
    });
    return this.strip(row);
  }

  async myCases(tenantId: string, userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) return [];
    const rows = await this.prisma.complianceCase.findMany({
      where: { tenantId, reporterId: emp.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.strip(r));
  }

  async list(tenantId: string, statuses?: ComplianceCaseStatus[]) {
    const rows = await this.prisma.complianceCase.findMany({
      where: {
        tenantId,
        ...(statuses?.length === 1 ? { status: statuses[0] } : {}),
        ...(statuses && statuses.length > 1 ? { status: { in: statuses } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.strip(r));
  }

  async update(
    tenantId: string,
    id: string,
    dto: { status?: ComplianceCaseStatus; assigneeId?: string; resolution?: string; legalHold?: boolean },
  ) {
    const row = await this.prisma.complianceCase.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Case not found');
    const resolved =
      dto.status === ComplianceCaseStatus.RESOLVED || dto.status === ComplianceCaseStatus.DISMISSED;
    const updated = await this.prisma.complianceCase.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.resolution !== undefined ? { resolution: dto.resolution } : {}),
        ...(dto.legalHold !== undefined ? { legalHold: dto.legalHold } : {}),
        ...(resolved ? { resolvedAt: new Date() } : {}),
      },
    });
    return this.strip(updated);
  }

  // ── retention ──────────────────────────────────────────────────────

  setRetention(tenantId: string, dto: { entity: string; retainMonths: number; purgeEnabled?: boolean }) {
    const entity = dto.entity.toUpperCase();
    return this.prisma.retentionPolicy.upsert({
      where: { tenantId_entity: { tenantId, entity } },
      create: { tenantId, entity, retainMonths: dto.retainMonths, purgeEnabled: !!dto.purgeEnabled },
      update: { retainMonths: dto.retainMonths, purgeEnabled: !!dto.purgeEnabled },
    });
  }

  listRetention(tenantId: string) {
    return this.prisma.retentionPolicy.findMany({ where: { tenantId } });
  }

  // What WOULD be purged under current policies (dry run; legal holds and
  // purge-disabled policies excluded). Actual deletion stays a manual step.
  async purgePreview(tenantId: string) {
    const policies = await this.prisma.retentionPolicy.findMany({ where: { tenantId } });
    const out: Record<string, unknown>[] = [];
    for (const p of policies) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - p.retainMonths);
      let count = 0;
      if (p.entity === 'CANDIDATE') {
        count = await this.prisma.candidate.count({
          where: { tenantId, createdAt: { lt: cutoff }, applications: { none: { status: { in: ['ONBOARDING', 'HIRED'] } } } },
        });
      } else if (p.entity === 'AUDIT_LOG') {
        count = await this.prisma.auditLog.count({
          where: { tenantId, createdAt: { lt: cutoff } } as Prisma.AuditLogWhereInput,
        });
      } else if (p.entity === 'ATTENDANCE') {
        count = await this.prisma.attendancePunch.count({
          where: { tenantId, workDate: { lt: cutoff } },
        });
      } else if (p.entity === 'COMPLIANCE_CASE') {
        count = await this.prisma.complianceCase.count({
          where: { tenantId, createdAt: { lt: cutoff }, legalHold: false, status: { in: ['RESOLVED', 'DISMISSED'] } },
        });
      }
      out.push({ entity: p.entity, retainMonths: p.retainMonths, purgeEnabled: p.purgeEnabled, eligibleRows: count });
    }
    return out;
  }
}

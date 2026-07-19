import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  attritionRate,
  avgDaysInStage,
  benchEmployees,
  funnelConversion,
  timesheetCompliance,
  utilizationPct,
} from './report-calculations';
import { ReportQueryDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  assertAccess(user: JwtPayload) {
    const ok =
      user.roles.includes(Role.TENANT_ADMIN) ||
      user.roles.includes(Role.HR) ||
      user.roles.includes(Role.MANAGER);
    if (!ok) throw new BadRequestException('Not authorized for reports');
  }

  async catalogue() {
    return this.prisma.reportDefinition.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
  }

  private dateRange(dto: ReportQueryDto) {
    const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 90 * 864e5);
    const to = dto.to ? new Date(dto.to) : new Date();
    return { from, to };
  }

  async run(tenantId: string, user: JwtPayload, code: string, dto: ReportQueryDto) {
    this.assertAccess(user);
    const def = await this.prisma.reportDefinition.findUnique({ where: { code } });
    if (!def?.active) throw new BadRequestException(`Unknown report: ${code}`);

    let result: unknown;
    switch (code) {
      case 'RPT-001':
        result = await this.executiveDashboard(tenantId, dto);
        break;
      case 'RPT-002':
        result = await this.recruitmentFunnel(tenantId, dto);
        break;
      case 'RPT-003':
        result = await this.stageAging(tenantId, dto);
        break;
      case 'RPT-004':
        result = await this.sourceEffectiveness(tenantId, dto);
        break;
      case 'RPT-005':
        result = await this.offerToJoin(tenantId, dto);
        break;
      case 'RPT-006':
        result = await this.onboardingCompletion(tenantId, dto);
        break;
      case 'RPT-007':
        result = await this.headcount(tenantId, dto);
        break;
      case 'RPT-008':
        result = await this.movement(tenantId, dto);
        break;
      case 'RPT-009':
        result = await this.attrition(tenantId, dto);
        break;
      case 'RPT-010':
        result = await this.attendanceExceptions(tenantId, dto);
        break;
      case 'RPT-011':
        result = await this.leaveBalance(tenantId, dto);
        break;
      case 'RPT-012':
        result = await this.timesheetComplianceReport(tenantId, dto);
        break;
      case 'RPT-013':
        result = await this.utilization(tenantId, dto);
        break;
      case 'RPT-014':
        result = await this.bench(tenantId, dto);
        break;
      case 'RPT-015':
        result = await this.payrollReconciliation(tenantId, dto);
        break;
      case 'RPT-016':
        result = await this.compensation(tenantId, dto);
        break;
      case 'RPT-017':
        result = await this.performanceDistribution(tenantId, dto);
        break;
      case 'RPT-018':
        result = await this.goalCompliance(tenantId, dto);
        break;
      case 'RPT-019':
        result = await this.trainingCompliance(tenantId, dto);
        break;
      case 'RPT-020':
        result = await this.engagement(tenantId, dto);
        break;
      case 'RPT-021':
        result = await this.recognitionReport(tenantId, dto);
        break;
      case 'RPT-022':
        result = await this.assetRecovery(tenantId, dto);
        break;
      case 'RPT-023':
        result = await this.policyAcceptance(tenantId, dto);
        break;
      case 'RPT-024':
        result = await this.auditAccess(tenantId, dto);
        break;
      case 'RPT-025':
        result = await this.exitClearance(tenantId, dto);
        break;
      case 'RPT-026':
        result = await this.globalMobility(tenantId, dto);
        break;
      default:
        throw new BadRequestException(`Report not implemented: ${code}`);
    }

    await this.audit.log({
      tenantId,
      userId: user.sub,
      action: 'EXPORT',
      entityType: 'REPORT',
      entityId: code,
      metadata: { filters: dto },
    });

    return { report: def, generatedAt: new Date().toISOString(), filters: dto, data: result };
  }

  private employeeWhere(tenantId: string, dto: ReportQueryDto): Prisma.EmployeeWhereInput {
    const w: Prisma.EmployeeWhereInput = { tenantId };
    if (dto.departmentId) w.departmentId = dto.departmentId;
    if (dto.managerId) w.managerId = dto.managerId;
    if (dto.status) w.status = dto.status as any;
    return w;
  }

  private async globalMobility(tenantId: string, dto: ReportQueryDto) {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 864e5);
    const [employerProfiles, candidateProfiles, cases, byStatus, byJurisdiction] = await Promise.all([
      this.prisma.jurisdictionEmployerProfile.findMany({ where: { tenantId }, orderBy: [{ jurisdictionCode: 'asc' }, { profileName: 'asc' }] }),
      this.prisma.candidateJurisdictionProfile.findMany({ where: { tenantId }, select: { id: true, candidateId: true, jurisdictionCode: true, memberStateCode: true, completionStatus: true, updatedAt: true } }),
      this.prisma.workAuthorizationCase.findMany({ where: { tenantId }, include: { candidate: { select: { firstName: true, lastName: true, email: true } } }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.workAuthorizationCase.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      this.prisma.workAuthorizationCase.groupBy({ by: ['jurisdictionCode'], where: { tenantId }, _count: true }),
    ]);
    const expiring = cases.filter((item) => item.expiresAt && item.expiresAt >= now && item.expiresAt <= in90Days);
    const expired = cases.filter((item) => item.expiresAt && item.expiresAt < now && item.status !== 'CLOSED');
    return {
      kpis: [
        { label: 'Employer country profiles', value: employerProfiles.length },
        { label: 'Candidate country profiles', value: candidateProfiles.length },
        { label: 'Open authorization cases', value: cases.filter((item) => !['CLOSED', 'REJECTED'].includes(item.status)).length },
        { label: 'Expiring in 90 days', value: expiring.length },
        { label: 'Expired and open', value: expired.length },
      ],
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count })),
      byJurisdiction: byJurisdiction.map((item) => ({ jurisdictionCode: item.jurisdictionCode, count: item._count })),
      employerProfiles,
      candidateProfiles,
      cases: cases.map((item) => ({ id: item.id, caseNumber: item.caseNumber, candidate: `${item.candidate.firstName} ${item.candidate.lastName}`, email: item.candidate.email, jurisdictionCode: item.jurisdictionCode, memberStateCode: item.memberStateCode, authorizationType: item.authorizationType, status: item.status, sponsorshipRequired: item.sponsorshipRequired, employerSpecific: item.employerSpecific, expiresAt: item.expiresAt })),
      expiringCases: expiring.map((item) => ({ caseNumber: item.caseNumber, candidate: `${item.candidate.firstName} ${item.candidate.lastName}`, jurisdictionCode: item.jurisdictionCode, status: item.status, expiresAt: item.expiresAt })),
      expiredCases: expired.map((item) => ({ caseNumber: item.caseNumber, candidate: `${item.candidate.firstName} ${item.candidate.lastName}`, jurisdictionCode: item.jurisdictionCode, status: item.status, expiresAt: item.expiresAt })),
    };
  }

  private async executiveDashboard(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [
      jobsPublished,
      applications,
      employees,
      onboardingOpen,
      exitsInFlight,
      timesheetsPending,
      activeProjects,
    ] = await Promise.all([
      this.prisma.job.count({ where: { tenantId, status: 'PUBLISHED' } }),
      this.prisma.application.count({
        where: { tenantId, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.employee.count({ where: this.employeeWhere(tenantId, dto) }),
      this.prisma.onboardingCase.count({ where: { tenantId, status: { not: 'COMPLETED' } } }),
      this.prisma.resignation.count({
        where: { tenantId, status: { notIn: ['RELEASED', 'WITHDRAWN', 'REJECTED'] } },
      }),
      this.prisma.timesheet.count({ where: { tenantId, status: 'SUBMITTED' } }),
      this.prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);
    return {
      kpis: [
        { label: 'Open jobs', value: jobsPublished },
        { label: 'Applications (period)', value: applications },
        { label: 'Employees', value: employees },
        { label: 'Onboarding in progress', value: onboardingOpen },
        { label: 'Exits in flight', value: exitsInFlight },
        { label: 'Timesheets pending approval', value: timesheetsPending },
        { label: 'Active projects', value: activeProjects },
      ],
    };
  }

  private async recruitmentFunnel(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const grouped = await this.prisma.application.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: from, lte: to } },
      _count: true,
    });
    const stages = grouped.map((g) => ({ status: g.status, count: g._count }));
    return { stages, funnel: funnelConversion(stages) };
  }

  private async stageAging(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const apps = await this.prisma.application.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { status: true, createdAt: true, updatedAt: true },
    });
    return { aging: avgDaysInStage(apps) };
  }

  private async sourceEffectiveness(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const grouped = await this.prisma.application.groupBy({
      by: ['source'],
      where: { tenantId, createdAt: { gte: from, lte: to } },
      _count: true,
    });
    return {
      sources: grouped.map((g) => ({
        source: g.source ?? 'unknown',
        count: g._count,
      })),
    };
  }

  private async offerToJoin(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [byStatus, joined] = await Promise.all([
      this.prisma.offer.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          joinDate: { gte: from, lte: to },
        },
      }),
    ]);
    return {
      offersByStatus: byStatus.map((o) => ({ status: o.status, count: o._count })),
      employeesJoined: joined,
    };
  }

  private async onboardingCompletion(tenantId: string, dto: ReportQueryDto) {
    const grouped = await this.prisma.onboardingCase.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const total = grouped.reduce((s, g) => s + g._count, 0);
    const completed = grouped.find((g) => g.status === 'COMPLETED')?._count ?? 0;
    return {
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count })),
      completionPct: total ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  }

  private async headcount(tenantId: string, dto: ReportQueryDto) {
    const byStatus = await this.prisma.employee.groupBy({
      by: ['status'],
      where: this.employeeWhere(tenantId, dto),
      _count: true,
    });
    const byDept = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: this.employeeWhere(tenantId, dto),
      _count: true,
    });
    const depts = await this.prisma.department.findMany({
      where: { tenantId, id: { in: byDept.map((d) => d.departmentId!).filter(Boolean) } },
      select: { id: true, name: true },
    });
    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byDepartment: byDept.map((d) => ({
        department: depts.find((x) => x.id === d.departmentId)?.name ?? 'Unassigned',
        count: d._count,
      })),
      total: byStatus.reduce((s, x) => s + x._count, 0),
    };
  }

  private async movement(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [hires, exits] = await Promise.all([
      this.prisma.employee.count({
        where: { tenantId, joinDate: { gte: from, lte: to } },
      }),
      this.prisma.resignation.count({
        where: {
          tenantId,
          submittedAt: { gte: from, lte: to },
          status: { in: ['RELEASED', 'ACCEPTED', 'CLEARANCE', 'FNF'] },
        },
      }),
    ]);
    return { hires, exits, net: hires - exits };
  }

  private async attrition(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [exits, active] = await Promise.all([
      this.prisma.resignation.count({
        where: {
          tenantId,
          submittedAt: { gte: from, lte: to },
          status: 'RELEASED',
        },
      }),
      this.prisma.employee.count({
        where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE'] } },
      }),
    ]);
    return { exits, avgHeadcount: active, attritionPct: attritionRate(exits, active) };
  }

  private async attendanceExceptions(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [late, missingOut, pendingRegs] = await Promise.all([
      this.prisma.attendancePunch.count({
        where: { tenantId, workDate: { gte: from, lte: to }, late: true },
      }),
      this.prisma.attendancePunch.count({
        where: {
          tenantId,
          workDate: { gte: from, lte: to },
          inAt: { not: null },
          outAt: null,
        },
      }),
      this.prisma.attendanceRegularization.count({
        where: { tenantId, status: 'PENDING' },
      }),
    ]);
    return { latePunches: late, missingCheckout: missingOut, pendingRegularizations: pendingRegs };
  }

  private async leaveBalance(tenantId: string, _dto: ReportQueryDto) {
    const year = new Date().getFullYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { tenantId, year },
      include: { leaveType: true },
      take: 500,
    });
    const empIds = [...new Set(balances.map((b) => b.employeeId))];
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: empIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));
    return {
      rows: balances.map((b) => {
        const emp = empMap.get(b.employeeId);
        return {
          employee: emp ? `${emp.user.firstName} ${emp.user.lastName}` : b.employeeId,
          employeeCode: emp?.employeeCode ?? '',
          leaveType: b.leaveType.name,
          allocated: b.allocated,
          used: b.used,
          remaining: b.allocated - b.used,
        };
      }),
    };
  }

  private async timesheetComplianceReport(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const grouped = await this.prisma.timesheet.groupBy({
      by: ['status'],
      where: { tenantId, periodStart: { gte: from, lte: to } },
      _count: true,
    });
    const submitted = grouped.find((g) => g.status === 'SUBMITTED')?._count ?? 0;
    const draft = grouped.find((g) => g.status === 'DRAFT')?._count ?? 0;
    const approved = grouped.find((g) => g.status === 'APPROVED')?._count ?? 0;
    return {
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count })),
      compliance: timesheetCompliance(submitted, draft, approved),
    };
  }

  private async utilization(tenantId: string, dto: ReportQueryDto) {
    const where: Prisma.ProjectAllocationWhereInput = {
      tenantId,
      endDate: null,
    };
    if (dto.projectId) where.projectId = dto.projectId;
    const allocs = await this.prisma.projectAllocation.findMany({
      where,
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        project: { select: { name: true, code: true } },
      },
    });
    const byEmployee = new Map<string, { name: string; code: string; pct: number; projects: string[] }>();
    for (const a of allocs) {
      const key = a.employeeId;
      const cur = byEmployee.get(key) ?? {
        name: `${a.employee.user.firstName} ${a.employee.user.lastName}`,
        code: a.employee.employeeCode,
        pct: 0,
        projects: [],
      };
      cur.pct += a.percentage;
      cur.projects.push(a.project.name);
      byEmployee.set(key, cur);
    }
    return {
      rows: [...byEmployee.values()].map((e) => ({
        ...e,
        utilizationPct: utilizationPct(e.pct),
      })),
    };
  }

  private async bench(tenantId: string, dto: ReportQueryDto) {
    const active = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
    });
    const allocs = await this.prisma.projectAllocation.findMany({
      where: { tenantId, endDate: null },
      select: { employeeId: true, percentage: true },
    });
    const bench = benchEmployees(
      allocs.map((a) => ({ employeeId: a.employeeId, allocatedPct: a.percentage })),
      active.map((e) => e.id),
    );
    return {
      rows: bench.map((b) => {
        const emp = active.find((e) => e.id === b.employeeId)!;
        return {
          employeeCode: emp.employeeCode,
          name: `${emp.user.firstName} ${emp.user.lastName}`,
          allocatedPct: b.allocatedPct,
          benchPct: 100 - b.allocatedPct,
        };
      }),
    };
  }

  private async payrollReconciliation(tenantId: string, dto: ReportQueryDto) {
    const employees = await this.prisma.employee.count({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE'] } },
    });
    const withSalary = await this.prisma.salaryStructure.groupBy({
      by: ['employeeId'],
      where: { tenantId, effectiveTo: null },
      _count: true,
    });
    const missing = employees - withSalary.length;
    return {
      activeEmployees: employees,
      withCurrentSalary: withSalary.length,
      missingSalaryStructure: Math.max(0, missing),
    };
  }

  private async compensation(tenantId: string, dto: ReportQueryDto) {
    const structures = await this.prisma.salaryStructure.findMany({
      where: { tenantId, effectiveTo: null },
      include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
      take: 200,
    });
    return {
      rows: structures.map((s) => ({
        employee: `${s.employee.user.firstName} ${s.employee.user.lastName}`,
        employeeCode: s.employee.employeeCode,
        annualCtc: s.annualCtc,
        isOffered: s.isOffered,
      })),
    };
  }

  private async performanceDistribution(tenantId: string, dto: ReportQueryDto) {
    const grouped = await this.prisma.appraisal.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const rated = await this.prisma.appraisal.findMany({
      where: { tenantId, finalRating: { not: null } },
      select: { finalRating: true },
    });
    return {
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count })),
      ratingDistribution: rated.reduce<Record<string, number>>((acc, r) => {
        const k = String(r.finalRating);
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async goalCompliance(tenantId: string, _dto: ReportQueryDto) {
    const cycles = await this.prisma.appraisalCycle.count({ where: { tenantId, isActive: true } });
    const completed = await this.prisma.appraisal.count({
      where: { tenantId, status: 'COMPLETED' },
    });
    const total = await this.prisma.appraisal.count({ where: { tenantId } });
    return {
      activeCycles: cycles,
      completedAppraisals: completed,
      completionPct: total ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  }

  private async trainingCompliance(tenantId: string, dto: ReportQueryDto) {
    const grouped = await this.prisma.trainingAssignment.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const total = grouped.reduce((s, g) => s + g._count, 0);
    const done = grouped.find((g) => g.status === 'COMPLETED')?._count ?? 0;
    return {
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count })),
      compliancePct: total ? Math.round((done / total) * 1000) / 10 : 0,
    };
  }

  private async engagement(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const [feedback, recognitions] = await Promise.all([
      this.prisma.feedback.count({
        where: { tenantId, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.recognition.count({
        where: { tenantId, createdAt: { gte: from, lte: to } },
      }),
    ]);
    return { feedbackCount: feedback, recognitionCount: recognitions };
  }

  private async recognitionReport(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const rows = await this.prisma.recognition.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const empIds = [...new Set(rows.flatMap((r) => [r.receiverId, r.giverId]))];
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: empIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const name = (id: string) => {
      const e = empMap.get(id);
      return e ? `${e.user.firstName} ${e.user.lastName}` : id;
    };
    return {
      rows: rows.map((r) => ({
        badge: r.badge,
        points: r.points,
        giver: name(r.giverId),
        receiver: name(r.receiverId),
        createdAt: r.createdAt,
      })),
    };
  }

  private async assetRecovery(tenantId: string, dto: ReportQueryDto) {
    const assigned = await this.prisma.assetAssignment.findMany({
      where: { tenantId, returnedAt: null },
      include: {
        asset: true,
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    return {
      rows: assigned.map((a) => ({
        assetTag: a.asset.assetTag,
        assetName: a.asset.model ?? a.asset.category,
        employee: `${a.employee.user.firstName} ${a.employee.user.lastName}`,
        employeeCode: a.employee.employeeCode,
      })),
    };
  }

  private async policyAcceptance(tenantId: string, dto: ReportQueryDto) {
    const mandatory = await this.prisma.policy.count({ where: { tenantId, mandatory: true } });
    const acks = await this.prisma.policyAcknowledgement.count({ where: { tenantId } });
    const employees = await this.prisma.employee.count({
      where: { tenantId, status: { in: ['ACTIVE', 'ONBOARDING'] } },
    });
    return {
      mandatoryPolicies: mandatory,
      acknowledgements: acks,
      activeEmployees: employees,
      expectedAcks: mandatory * employees,
    };
  }

  private async auditAccess(tenantId: string, dto: ReportQueryDto) {
    const { from, to } = this.dateRange(dto);
    const result = await this.audit.list(tenantId, { from, to, limit: 100 });
    const logs = Array.isArray(result) ? result : result.data;
    const byAction = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action] = (acc[l.action] ?? 0) + 1;
      return acc;
    }, {});
    return { total: logs.length, byAction, recent: logs.slice(0, 20) };
  }

  private async exitClearance(tenantId: string, dto: ReportQueryDto) {
    const clearances = await this.prisma.exitClearance.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const inFlight = await this.prisma.resignation.count({
      where: { tenantId, status: { in: ['CLEARANCE', 'FNF', 'ACCEPTED'] } },
    });
    return {
      clearancesByStatus: clearances.map((c) => ({ status: c.status, count: c._count })),
      resignationsInClearance: inFlight,
    };
  }
}

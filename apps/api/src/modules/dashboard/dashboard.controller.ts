import { Controller, Get } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';

// Business dashboard KPIs — every number aggregated live from the database.
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Get('kpis')
  async kpis(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    const isOps =
      user.roles.includes(Role.TENANT_ADMIN) ||
      user.roles.includes(Role.HR) ||
      user.roles.includes(Role.MANAGER);

    const result: any = { business: null, personal: null, myApprovals: 0 };
    result.myApprovals = (await this.approvals.myPending(tenantId, user.sub)).length;

    if (isOps) {
      const [
        jobsPublished, jobsDraft,
        appsByStatus, employeesByStatus,
        onboardingOpen, timesheetsSubmitted,
        approvalsPending, shortlisted,
        exitsInFlight, recognitions30d,
        candidates, unparsedResumes,
        projectsActive, assetsAssigned,
        appsByJob,
      ] = await Promise.all([
        this.prisma.job.count({ where: { tenantId, status: 'PUBLISHED' } }),
        this.prisma.job.count({ where: { tenantId, status: 'DRAFT' } }),
        this.prisma.application.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
        this.prisma.employee.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
        this.prisma.onboardingCase.count({ where: { tenantId, status: { not: 'COMPLETED' } } }),
        this.prisma.timesheet.count({ where: { tenantId, status: 'SUBMITTED' } }),
        this.prisma.approvalRequest.count({ where: { tenantId, status: 'PENDING' } }),
        this.prisma.matchScore.count({ where: { tenantId, shortlisted: true } }),
        this.prisma.resignation.count({ where: { tenantId, status: { notIn: ['RELEASED', 'WITHDRAWN', 'REJECTED'] } } }),
        this.prisma.recognition.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
        this.prisma.candidate.count({ where: { tenantId } }),
        this.prisma.candidate.count({ where: { tenantId, resumeFileId: { not: null }, parsedResume: { equals: Prisma.AnyNull } } }),
        this.prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
        this.prisma.assetAssignment.count({ where: { tenantId, returnedAt: null } }),
        this.prisma.application.groupBy({ by: ['jobId'], where: { tenantId }, _count: true }),
      ]);
      const jobTitles = await this.prisma.job.findMany({
        where: { id: { in: appsByJob.map((a) => a.jobId) } },
        select: { id: true, title: true },
      });
      result.business = {
        jobsPublished, jobsDraft,
        applicationsTotal: appsByStatus.reduce((s, a) => s + (a._count as number), 0),
        applicationsByStatus: appsByStatus.map((a) => ({ status: a.status, count: a._count })),
        applicationsByJob: appsByJob.map((a) => ({
          job: jobTitles.find((j) => j.id === a.jobId)?.title ?? '?',
          count: a._count,
        })),
        employeesByStatus: employeesByStatus.map((e) => ({ status: e.status, count: e._count })),
        employeesTotal: employeesByStatus.reduce((s, e) => s + (e._count as number), 0),
        onboardingOpen, timesheetsSubmitted, approvalsPending, shortlisted,
        exitsInFlight, recognitions30d, candidates, unparsedResumes,
        projectsActive, assetsAssigned,
      };
    }

    const employee = await this.prisma.employee.findUnique({ where: { userId: user.sub } });
    if (employee) {
      const [myTimesheets, myDrafts, myTrainings, myAppraisals, myRecognitions, myResignation] =
        await Promise.all([
          this.prisma.timesheet.count({ where: { employeeId: employee.id, status: 'SUBMITTED' } }),
          this.prisma.timesheet.count({ where: { employeeId: employee.id, status: 'DRAFT' } }),
          this.prisma.trainingAssignment.count({ where: { employeeId: employee.id, status: { not: 'COMPLETED' } } }),
          this.prisma.appraisal.count({ where: { employeeId: employee.id, status: 'SELF_REVIEW' } }),
          this.prisma.recognition.count({ where: { receiverId: employee.id } }),
          this.prisma.resignation.findUnique({ where: { employeeId: employee.id }, select: { status: true } }),
        ]);
      result.personal = {
        timesheetsAwaitingApproval: myTimesheets,
        timesheetDrafts: myDrafts,
        trainingsToComplete: myTrainings,
        appraisalsAwaitingSelfReview: myAppraisals,
        recognitionsReceived: myRecognitions,
        resignationStatus: myResignation?.status ?? null,
      };
    }
    return result;
  }
}

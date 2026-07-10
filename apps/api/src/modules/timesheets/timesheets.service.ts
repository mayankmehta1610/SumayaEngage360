import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TimesheetStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimesheetDto, TimesheetActionDto } from './timesheets.dto';

@Injectable()
export class TimesheetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  // Draft with entries; internal or client-facing per spec.
  async create(tenantId: string, userId: string, dto: CreateTimesheetDto) {
    const employee = await this.employeeForUser(userId);
    return this.prisma.timesheet.create({
      data: {
        tenantId,
        employeeId: employee.id,
        projectId: dto.projectId,
        type: dto.type,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        entries: {
          create: dto.entries.map((e) => ({
            workDate: new Date(e.workDate),
            hours: e.hours,
            task: e.task,
            notes: e.notes,
          })),
        },
      },
      include: { entries: true },
    });
  }

  async mine(tenantId: string, userId: string) {
    const employee = await this.employeeForUser(userId);
    return this.prisma.timesheet.findMany({
      where: { tenantId, employeeId: employee.id },
      include: {
        entries: { orderBy: { workDate: 'asc' } },
        project: { select: { name: true, code: true } },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async submit(tenantId: string, userId: string, timesheetId: string) {
    const employee = await this.employeeForUser(userId);
    const ts = await this.prisma.timesheet.findFirst({
      where: { id: timesheetId, tenantId, employeeId: employee.id },
    });
    if (!ts) throw new NotFoundException('Timesheet not found');
    if (ts.status !== TimesheetStatus.DRAFT && ts.status !== TimesheetStatus.DISCARDED) {
      throw new BadRequestException('Only draft or discarded timesheets can be submitted');
    }
    return this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: { status: TimesheetStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  // Manager inbox: submitted timesheets from direct reports.
  async pendingForManager(tenantId: string, userId: string) {
    const manager = await this.employeeForUser(userId);
    return this.prisma.timesheet.findMany({
      where: {
        tenantId,
        status: TimesheetStatus.SUBMITTED,
        employee: { managerId: manager.id },
      },
      include: {
        entries: true,
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        project: { select: { name: true } },
      },
    });
  }

  // Approve / discard by the reporting manager (HR/admin can override).
  async actOn(
    tenantId: string,
    userId: string,
    roles: string[],
    timesheetId: string,
    approve: boolean,
    dto: TimesheetActionDto,
  ) {
    const ts = await this.prisma.timesheet.findFirst({
      where: { id: timesheetId, tenantId, status: TimesheetStatus.SUBMITTED },
      include: { employee: true },
    });
    if (!ts) throw new NotFoundException('Submitted timesheet not found');

    const isPrivileged =
      roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.HR);
    if (!isPrivileged) {
      const actor = await this.employeeForUser(userId);
      if (ts.employee.managerId !== actor.id) {
        throw new ForbiddenException('Only the reporting manager can act on this timesheet');
      }
    }

    return this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: approve ? TimesheetStatus.APPROVED : TimesheetStatus.DISCARDED,
        approverId: userId,
        actionNote: dto.note,
        actedAt: new Date(),
      },
    });
  }
}

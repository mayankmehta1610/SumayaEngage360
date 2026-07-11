import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Leave management: tenant-configurable types with annual quotas, per-year
// balances (auto-provisioned from the quota), request -> reporting-manager
// approval, cancellation, and a team leave calendar.
@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  // ── leave types (HR configuration) ─────────────────────────────────

  createType(
    tenantId: string,
    dto: { code: string; name: string; annualQuota: number; carryForward?: boolean },
  ) {
    return this.prisma.leaveType.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        annualQuota: dto.annualQuota,
        carryForward: !!dto.carryForward,
      },
    });
  }

  listTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({ where: { tenantId, isActive: true } });
  }

  // ── balances ───────────────────────────────────────────────────────

  private async ensureBalance(tenantId: string, employeeId: string, leaveTypeId: string) {
    const year = new Date().getUTCFullYear();
    const type = await this.prisma.leaveType.findFirst({
      where: { id: leaveTypeId, tenantId, isActive: true },
    });
    if (!type) throw new NotFoundException('Leave type not found');
    return this.prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      create: { tenantId, employeeId, leaveTypeId, year, allocated: type.annualQuota },
      update: {},
    });
  }

  async myBalances(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const types = await this.listTypes(tenantId);
    const out = [];
    for (const t of types) {
      const b = await this.ensureBalance(tenantId, emp.id, t.id);
      out.push({
        leaveType: { id: t.id, code: t.code, name: t.name },
        year: b.year,
        allocated: b.allocated,
        used: b.used,
        remaining: b.allocated - b.used,
      });
    }
    return out;
  }

  // ── requests ───────────────────────────────────────────────────────

  private workingDays(start: Date, end: Date): number {
    let days = 0;
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) days++; // Mon–Fri workweek
    }
    return days;
  }

  async request(
    tenantId: string,
    userId: string,
    dto: { leaveTypeId: string; startDate: string; endDate: string; reason?: string },
  ) {
    const emp = await this.employeeForUser(userId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date is before start date');
    const days = this.workingDays(start, end);
    if (days <= 0) throw new BadRequestException('Selected range has no working days');

    const balance = await this.ensureBalance(tenantId, emp.id, dto.leaveTypeId);
    if (balance.allocated - balance.used < days) {
      throw new BadRequestException(
        `Insufficient balance: ${balance.allocated - balance.used} day(s) left, ${days} requested`,
      );
    }
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId: emp.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) throw new BadRequestException('Overlapping leave request exists');

    return this.prisma.leaveRequest.create({
      data: {
        tenantId, employeeId: emp.id, leaveTypeId: dto.leaveTypeId,
        startDate: start, endDate: end, days, reason: dto.reason,
      },
      include: { leaveType: { select: { code: true, name: true } } },
    });
  }

  async mine(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.leaveRequest.findMany({
      where: { tenantId, employeeId: emp.id },
      include: { leaveType: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const emp = await this.employeeForUser(userId);
    const lr = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId, employeeId: emp.id },
    });
    if (!lr) throw new NotFoundException('Leave request not found');
    if (lr.status === LeaveStatus.CANCELLED) return lr;

    const wasApproved = lr.status === LeaveStatus.APPROVED;
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });
    if (wasApproved) {
      // return the days to the balance
      const year = lr.startDate.getUTCFullYear();
      await this.prisma.leaveBalance.updateMany({
        where: { employeeId: emp.id, leaveTypeId: lr.leaveTypeId, year },
        data: { used: { decrement: lr.days } },
      });
    }
    return updated;
  }

  // Manager inbox: pending leave of direct reports.
  async pendingForManager(tenantId: string, userId: string) {
    const mgr = await this.employeeForUser(userId);
    const reports = await this.prisma.employee.findMany({
      where: { tenantId, managerId: mgr.id },
      select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
    });
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: LeaveStatus.PENDING,
        employeeId: { in: reports.map((r) => r.id) },
      },
      include: { leaveType: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ ...r, employee: reports.find((x) => x.id === r.employeeId) }));
  }

  async act(
    tenantId: string,
    userId: string,
    roles: string[],
    id: string,
    approve: boolean,
    note?: string,
  ) {
    const lr = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId, status: LeaveStatus.PENDING },
    });
    if (!lr) throw new NotFoundException('Pending leave request not found');

    const privileged = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.HR);
    if (!privileged) {
      const actor = await this.employeeForUser(userId);
      const subject = await this.prisma.employee.findUnique({ where: { id: lr.employeeId } });
      if (subject?.managerId !== actor.id) {
        throw new ForbiddenException('Only the reporting manager can act on this leave');
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
        actorId: userId,
        actionNote: note,
        actedAt: new Date(),
      },
    });
    if (approve) {
      const year = lr.startDate.getUTCFullYear();
      await this.prisma.leaveBalance.updateMany({
        where: { employeeId: lr.employeeId, leaveTypeId: lr.leaveTypeId, year },
        data: { used: { increment: lr.days } },
      });
    }
    return updated;
  }

  // Approved leave across the tenant for a month (team calendar).
  async calendar(tenantId: string, month?: string) {
    const base = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
    const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: { leaveType: { select: { code: true } } },
      orderBy: { startDate: 'asc' },
    });
    const emps = await this.prisma.employee.findMany({
      where: { id: { in: rows.map((r) => r.employeeId) } },
      select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
    });
    return rows.map((r) => ({ ...r, employee: emps.find((e) => e.id === r.employeeId) }));
  }
}

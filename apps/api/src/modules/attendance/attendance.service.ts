import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegularizationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Web check-in/out (one punch row per employee per day) with late detection
// against the tenant's configurable shift start, plus a manager-approved
// regularization flow for missing/incorrect punches.
const DEFAULT_SHIFT_START = process.env.SHIFT_START ?? '09:30'; // tenant TZ

function dayStart(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  async checkIn(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const workDate = dayStart();
    const existing = await this.prisma.attendancePunch.findUnique({
      where: { employeeId_workDate: { employeeId: emp.id, workDate } },
    });
    if (existing?.inAt) throw new BadRequestException('Already checked in today');

    const now = new Date();
    const [h, m] = DEFAULT_SHIFT_START.split(':').map(Number);
    const shift = new Date(workDate);
    shift.setUTCHours(h, m, 0, 0);
    const late = now > shift;

    return this.prisma.attendancePunch.upsert({
      where: { employeeId_workDate: { employeeId: emp.id, workDate } },
      create: { tenantId, employeeId: emp.id, workDate, inAt: now, late },
      update: { inAt: now, late },
    });
  }

  async checkOut(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const workDate = dayStart();
    const punch = await this.prisma.attendancePunch.findUnique({
      where: { employeeId_workDate: { employeeId: emp.id, workDate } },
    });
    if (!punch?.inAt) throw new BadRequestException('Check in first');
    return this.prisma.attendancePunch.update({
      where: { id: punch.id },
      data: { outAt: new Date() },
    });
  }

  async myPunches(tenantId: string, userId: string, days = 30) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.attendancePunch.findMany({
      where: {
        tenantId,
        employeeId: emp.id,
        workDate: { gte: new Date(Date.now() - days * 864e5) },
      },
      orderBy: { workDate: 'desc' },
    });
  }

  // Team/tenant attendance for a given day (managers + HR).
  async register(tenantId: string, date?: string) {
    const workDate = dayStart(date ? new Date(date) : new Date());
    const punches = await this.prisma.attendancePunch.findMany({
      where: { tenantId, workDate },
    });
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE'] } },
      select: {
        id: true,
        employeeCode: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return employees.map((e) => {
      const p = punches.find((x) => x.employeeId === e.id);
      return {
        employee: e,
        inAt: p?.inAt ?? null,
        outAt: p?.outAt ?? null,
        late: p?.late ?? false,
        present: !!p?.inAt,
      };
    });
  }

  // ── regularization ─────────────────────────────────────────────────

  async requestRegularization(
    tenantId: string,
    userId: string,
    dto: { workDate: string; requestedIn?: string; requestedOut?: string; reason: string },
  ) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId: emp.id,
        workDate: dayStart(new Date(dto.workDate)),
        requestedIn: dto.requestedIn ? new Date(dto.requestedIn) : null,
        requestedOut: dto.requestedOut ? new Date(dto.requestedOut) : null,
        reason: dto.reason,
      },
    });
  }

  async myRegularizations(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.attendanceRegularization.findMany({
      where: { tenantId, employeeId: emp.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pendingRegularizations(tenantId: string, userId: string) {
    const mgr = await this.employeeForUser(userId);
    const reports = await this.prisma.employee.findMany({
      where: { tenantId, managerId: mgr.id },
      select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
    });
    const rows = await this.prisma.attendanceRegularization.findMany({
      where: {
        tenantId,
        status: RegularizationStatus.PENDING,
        employeeId: { in: reports.map((r) => r.id) },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      employee: reports.find((x) => x.id === r.employeeId),
    }));
  }

  async actOnRegularization(
    tenantId: string,
    userId: string,
    roles: string[],
    id: string,
    approve: boolean,
    note?: string,
  ) {
    const row = await this.prisma.attendanceRegularization.findFirst({
      where: { id, tenantId, status: RegularizationStatus.PENDING },
    });
    if (!row) throw new NotFoundException('Pending regularization not found');

    const privileged = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.HR);
    if (!privileged) {
      const actor = await this.employeeForUser(userId);
      const subject = await this.prisma.employee.findUnique({ where: { id: row.employeeId } });
      if (subject?.managerId !== actor.id) {
        throw new ForbiddenException('Only the reporting manager can act on this request');
      }
    }

    const updated = await this.prisma.attendanceRegularization.update({
      where: { id },
      data: {
        status: approve ? RegularizationStatus.APPROVED : RegularizationStatus.REJECTED,
        actorId: userId,
        actionNote: note,
        actedAt: new Date(),
      },
    });
    if (approve) {
      // apply the corrected punch
      await this.prisma.attendancePunch.upsert({
        where: { employeeId_workDate: { employeeId: row.employeeId, workDate: row.workDate } },
        create: {
          tenantId,
          employeeId: row.employeeId,
          workDate: row.workDate,
          inAt: row.requestedIn,
          outAt: row.requestedOut,
          source: 'REGULARIZED',
        },
        update: {
          ...(row.requestedIn ? { inAt: row.requestedIn } : {}),
          ...(row.requestedOut ? { outAt: row.requestedOut } : {}),
          source: 'REGULARIZED',
        },
      });
    }
    return updated;
  }

  // ── Roster, geofencing, biometric (CFG-006 / INT-011) ─────────────────

  listRoster(tenantId: string, date?: string) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return this.prisma.rosterShift.findMany({ where: { tenantId, date: d } });
  }

  createRoster(tenantId: string, dto: { employeeId: string; shiftId: string; date: string; location?: string }) {
    return this.prisma.rosterShift.create({
      data: { tenantId, employeeId: dto.employeeId, shiftId: dto.shiftId, date: new Date(dto.date), location: dto.location },
    });
  }

  geofences(tenantId: string) {
    return this.prisma.geofenceZone.findMany({ where: { tenantId, isActive: true } });
  }

  createGeofence(tenantId: string, dto: { name: string; latitude: number; longitude: number; radiusM?: number }) {
    return this.prisma.geofenceZone.create({ data: { tenantId, ...dto } });
  }

  async biometricPunch(tenantId: string, dto: { employeeCode: string; type: string; deviceId?: string }) {
    const emp = await this.prisma.employee.findFirst({ where: { tenantId, employeeCode: dto.employeeCode } });
    if (!emp) throw new NotFoundException('Employee not found');
    const now = new Date();
    const workDate = new Date(now);
    workDate.setHours(0, 0, 0, 0);
    if (dto.type === 'IN') {
      return this.prisma.attendancePunch.upsert({
        where: { employeeId_workDate: { employeeId: emp.id, workDate } },
        create: { tenantId, employeeId: emp.id, workDate, inAt: now, source: 'BIOMETRIC' },
        update: { inAt: now, source: 'BIOMETRIC' },
      });
    }
    return this.prisma.attendancePunch.update({
      where: { employeeId_workDate: { employeeId: emp.id, workDate } },
      data: { outAt: now },
    });
  }
}

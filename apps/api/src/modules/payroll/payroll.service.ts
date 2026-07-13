import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Comp = { code: string; name: string; monthly: number; type: string };

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultComponents(tenantId: string) {
    const count = await this.prisma.salaryComponentMaster.count({ where: { tenantId } });
    if (count > 0) return;
    const defaults = [
      { code: 'BASIC', name: 'Basic Salary', type: 'EARNING' },
      { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING' },
      { code: 'PF', name: 'Provident Fund', type: 'DEDUCTION', isStatutory: true },
      { code: 'PT', name: 'Professional Tax', type: 'TAX', isStatutory: true },
      { code: 'TDS', name: 'Income Tax', type: 'TAX', isStatutory: true },
    ];
    await this.prisma.salaryComponentMaster.createMany({
      data: defaults.map((d) => ({ tenantId, ...d })),
    });
  }

  components(tenantId: string) {
    return this.prisma.salaryComponentMaster.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  createComponent(tenantId: string, dto: { code: string; name: string; type: string; isStatutory?: boolean }) {
    return this.prisma.salaryComponentMaster.create({ data: { tenantId, ...dto } });
  }

  calendars(tenantId: string) {
    return this.prisma.payrollCalendar.findMany({ where: { tenantId, isActive: true } });
  }

  createCalendar(tenantId: string, dto: { name: string; frequency?: string; payDay?: number }) {
    return this.prisma.payrollCalendar.create({
      data: { tenantId, name: dto.name, frequency: dto.frequency ?? 'MONTHLY', payDay: dto.payDay ?? 28 },
    });
  }

  runs(tenantId: string) {
    return this.prisma.payrollRun.findMany({
      where: { tenantId },
      include: { calendar: true, _count: { select: { payslips: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRun(
    tenantId: string,
    dto: { calendarId: string; periodStart: string; periodEnd: string },
  ) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodStart > periodEnd) throw new BadRequestException('Period start must be before period end');
    const cal = await this.prisma.payrollCalendar.findFirst({
      where: { id: dto.calendarId, tenantId },
    });
    if (!cal) throw new NotFoundException('Payroll calendar not found');
    const overlap = await this.prisma.payrollRun.findFirst({
      where: {
        tenantId,
        calendarId: dto.calendarId,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
    if (overlap) throw new BadRequestException('A payroll run already overlaps this calendar period');
    return this.prisma.payrollRun.create({
      data: {
        tenantId,
        calendarId: dto.calendarId,
        periodStart,
        periodEnd,
      },
    });
  }

  async processRun(tenantId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === 'COMPLETED') throw new BadRequestException('Run already completed');

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE', 'ONBOARDING'] } },
    });
    const adjustmentPeriod = run.periodStart.toISOString().slice(0, 7);
    const adjustments = await this.prisma.payrollAdjustment.findMany({
      where: { tenantId, period: adjustmentPeriod, employeeId: { in: employees.map((employee) => employee.id) } },
    });
    const adjustmentsByEmployee = new Map<string, typeof adjustments>();
    for (const adjustment of adjustments) {
      const list = adjustmentsByEmployee.get(adjustment.employeeId) ?? [];
      list.push(adjustment);
      adjustmentsByEmployee.set(adjustment.employeeId, list);
    }

    const payslips = [];
    for (const emp of employees) {
      const structure = await this.prisma.salaryStructure.findFirst({
        where: { tenantId, employeeId: emp.id, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!structure) continue;
      const comps = (structure.components as Comp[]) ?? [];
      let gross = 0;
      let deductions = 0;
      const lines = comps.map((c) => {
        const amt = Number(c.monthly ?? 0);
        if (c.type === 'EARNING') gross += amt;
        else deductions += amt;
        return { ...c, amount: amt };
      });
      for (const adjustment of adjustmentsByEmployee.get(emp.id) ?? []) {
        const rawAmount = Number(adjustment.amount);
        const amount = ['LOAN', 'ADVANCE'].includes(adjustment.type)
          ? Math.min(Number(adjustment.balance ?? rawAmount), Number(adjustment.monthlyRecover ?? rawAmount))
          : rawAmount;
        const earning = ['BONUS', 'INCENTIVE', 'OVERTIME', 'ARREAR'].includes(adjustment.type);
        if (earning) gross += amount;
        else deductions += amount;
        lines.push({ code: adjustment.type, name: adjustment.note || adjustment.type, monthly: amount, type: earning ? 'EARNING' : 'DEDUCTION', amount });
      }
      const net = gross - deductions;
      const slip = await this.prisma.payslip.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: runId, employeeId: emp.id } },
        create: {
          tenantId,
          payrollRunId: runId,
          employeeId: emp.id,
          grossPay: gross,
          netPay: net,
          components: lines as unknown as Prisma.InputJsonValue,
        },
        update: {
          grossPay: gross,
          netPay: net,
          components: lines as unknown as Prisma.InputJsonValue,
        },
      });
      payslips.push(slip);
    }

    for (const adjustment of adjustments.filter((item) => ['LOAN', 'ADVANCE'].includes(item.type) && item.balance != null)) {
      const recovery = Math.min(Number(adjustment.balance), Number(adjustment.monthlyRecover ?? adjustment.amount));
      await this.prisma.payrollAdjustment.update({ where: { id: adjustment.id }, data: { balance: Math.max(0, Number(adjustment.balance) - recovery) } });
    }

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
    return { runId, payslipsGenerated: payslips.length, payslips };
  }

  payslipsForRun(tenantId: string, runId: string) {
    return this.prisma.payslip.findMany({
      where: { tenantId, payrollRunId: runId },
      include: {
        employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  myPayslips(tenantId: string, employeeId: string) {
    return this.prisma.payslip.findMany({
      where: { tenantId, employeeId },
      include: { payrollRun: { include: { calendar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { AdjustmentType, Role } from '@prisma/client';
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class AdjustmentDto {
  @IsString()
  employeeId: string;

  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @IsNumber()
  amount: number;

  @IsString()
  period: string; // YYYY-MM

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRecover?: number;
}

class TaxDeclarationDto {
  @IsString()
  fiscalYear: string;

  @IsOptional()
  @IsString()
  regime?: string;

  @IsArray()
  items: { section: string; description?: string; amount: number }[];
}

// Bonus / incentive / overtime / arrears / loans / advances + tax declarations.
@Controller('payroll')
export class PayrollExtrasController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('adjustments')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  async createAdjustment(@TenantId() tenantId: string, @Body() dto: AdjustmentDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const isLoan = dto.type === AdjustmentType.LOAN || dto.type === AdjustmentType.ADVANCE;
    return this.prisma.payrollAdjustment.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        type: dto.type,
        amount: dto.amount,
        period: dto.period,
        note: dto.note,
        balance: isLoan ? dto.amount : null,
        monthlyRecover: isLoan ? dto.monthlyRecover ?? null : null,
      },
    });
  }

  @Get('adjustments')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listAdjustments(@TenantId() tenantId: string, @Query('period') period?: string) {
    return this.prisma.payrollAdjustment.findMany({
      where: { tenantId, ...(period ? { period } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('adjustments/mine')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE)
  async myAdjustments(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    const emp = await this.prisma.employee.findFirst({ where: { userId: u.sub, tenantId } });
    if (!emp) return [];
    return this.prisma.payrollAdjustment.findMany({
      where: { tenantId, employeeId: emp.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('tax-declarations')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE)
  async declare(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload, @Body() dto: TaxDeclarationDto) {
    const emp = await this.prisma.employee.findFirst({ where: { userId: u.sub, tenantId } });
    if (!emp) throw new NotFoundException('Employee profile not found');
    const total = dto.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    return this.prisma.taxDeclaration.upsert({
      where: { employeeId_fiscalYear: { employeeId: emp.id, fiscalYear: dto.fiscalYear } },
      create: {
        tenantId, employeeId: emp.id, fiscalYear: dto.fiscalYear,
        regime: dto.regime ?? 'NEW', items: dto.items as any, total,
      },
      update: { regime: dto.regime ?? 'NEW', items: dto.items as any, total, status: 'SUBMITTED' },
    });
  }

  @Get('tax-declarations/mine')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE)
  async myDeclarations(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    const emp = await this.prisma.employee.findFirst({ where: { userId: u.sub, tenantId } });
    if (!emp) return [];
    return this.prisma.taxDeclaration.findMany({ where: { tenantId, employeeId: emp.id } });
  }

  @Get('tax-declarations')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listDeclarations(@TenantId() tenantId: string) {
    return this.prisma.taxDeclaration.findMany({ where: { tenantId } });
  }

  @Post('tax-declarations/:id/verify')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  async verifyDeclaration(@TenantId() tenantId: string, @Param('id') id: string) {
    const declaration = await this.prisma.taxDeclaration.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!declaration) throw new NotFoundException('Tax declaration not found');
    return this.prisma.taxDeclaration.update({ where: { id }, data: { status: 'VERIFIED' } });
  }
}

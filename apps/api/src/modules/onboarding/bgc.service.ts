import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BgcStatus, OnboardingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BgcReportDto, CreateBgcVendorDto, SubmitBgcDto } from './onboarding.dto';

// Background checks are visible to HR/admin and the assigned third-party
// vendor only — never exposed on any employee-facing endpoint.
@Injectable()
export class BgcService {
  constructor(private readonly prisma: PrismaService) {}

  createVendor(tenantId: string, dto: CreateBgcVendorDto) {
    return this.prisma.bgcVendor.create({
      data: { tenantId, name: dto.name, email: dto.email.toLowerCase() },
    });
  }

  listVendors(tenantId: string) {
    return this.prisma.bgcVendor.findMany({ where: { tenantId, isActive: true } });
  }

  // HR submits an employee's BGC case to a vendor.
  async submit(tenantId: string, employeeId: string, dto: SubmitBgcDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const vendor = await this.prisma.bgcVendor.findFirst({
      where: { id: dto.vendorId, tenantId, isActive: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const check = await this.prisma.backgroundCheck.upsert({
      where: { employeeId },
      create: {
        tenantId,
        employeeId,
        vendorId: vendor.id,
        status: BgcStatus.SUBMITTED_TO_VENDOR,
        submittedAt: new Date(),
      },
      update: {
        vendorId: vendor.id,
        status: BgcStatus.SUBMITTED_TO_VENDOR,
        submittedAt: new Date(),
      },
    });
    await this.prisma.onboardingCase.updateMany({
      where: { employeeId, status: { not: OnboardingStatus.COMPLETED } },
      data: { status: OnboardingStatus.BGC },
    });
    return check;
  }

  listChecks(tenantId: string) {
    return this.prisma.backgroundCheck.findMany({
      where: { tenantId },
      include: {
        vendor: { select: { name: true } },
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  // ── vendor portal (restricted BGC_VENDOR role, matched by user email) ──

  private async vendorForUser(tenantId: string, userEmail: string) {
    const vendor = await this.prisma.bgcVendor.findFirst({
      where: { tenantId, email: userEmail.toLowerCase(), isActive: true },
    });
    if (!vendor) throw new ForbiddenException('No vendor profile for this user');
    return vendor;
  }

  async vendorCases(tenantId: string, userEmail: string) {
    const vendor = await this.vendorForUser(tenantId, userEmail);
    return this.prisma.backgroundCheck.findMany({
      where: { tenantId, vendorId: vendor.id },
      include: {
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  // Vendor uploads their report and verdict.
  async submitReport(
    tenantId: string,
    checkId: string,
    userEmail: string,
    dto: BgcReportDto,
  ) {
    const vendor = await this.vendorForUser(tenantId, userEmail);
    const check = await this.prisma.backgroundCheck.findFirst({
      where: { id: checkId, tenantId, vendorId: vendor.id },
    });
    if (!check) throw new NotFoundException('BGC case not found');
    return this.prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status: dto.status,
        reportFileId: dto.reportFileId,
        remarks: dto.remarks,
        completedAt: [BgcStatus.CLEAR, BgcStatus.DISCREPANCY, BgcStatus.FAILED].includes(
          dto.status as any,
        )
          ? new Date()
          : null,
      },
    });
  }
}

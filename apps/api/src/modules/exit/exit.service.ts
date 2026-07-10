import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalEntity,
  ClearanceStatus,
  EmployeeStatus,
  ResignationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import {
  AcceptResignationDto,
  ClearanceActionDto,
  DelegateClearanceDto,
  FnfDto,
  SubmitResignationDto,
} from './exit.dto';

@Injectable()
export class ExitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  // 1. Employee submits resignation → designation-based approval chain starts.
  async submit(tenantId: string, userId: string, dto: SubmitResignationDto) {
    const employee = await this.employeeForUser(userId);
    const existing = await this.prisma.resignation.findUnique({
      where: { employeeId: employee.id },
    });
    if (existing && existing.status !== ResignationStatus.WITHDRAWN) {
      throw new BadRequestException('A resignation is already in progress');
    }

    const resignation = existing
      ? await this.prisma.resignation.update({
          where: { id: existing.id },
          data: {
            reason: dto.reason,
            requestedLastDay: dto.requestedLastDay
              ? new Date(dto.requestedLastDay)
              : null,
            status: ResignationStatus.SUBMITTED,
            submittedAt: new Date(),
          },
        })
      : await this.prisma.resignation.create({
          data: {
            tenantId,
            employeeId: employee.id,
            reason: dto.reason,
            requestedLastDay: dto.requestedLastDay
              ? new Date(dto.requestedLastDay)
              : null,
          },
        });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { status: EmployeeStatus.ON_NOTICE },
    });

    const request = await this.approvals.startRequest(
      tenantId,
      ApprovalEntity.RESIGNATION,
      resignation.id,
    );
    if (request) {
      await this.prisma.resignation.update({
        where: { id: resignation.id },
        data: { status: ResignationStatus.APPROVAL },
      });
    }
    return { resignation, approvalRequired: !!request };
  }

  async withdraw(tenantId: string, userId: string) {
    const employee = await this.employeeForUser(userId);
    const resignation = await this.prisma.resignation.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        status: {
          in: [ResignationStatus.SUBMITTED, ResignationStatus.APPROVAL],
        },
      },
    });
    if (!resignation) {
      throw new NotFoundException('No withdrawable resignation found');
    }
    await this.prisma.$transaction([
      this.prisma.resignation.update({
        where: { id: resignation.id },
        data: { status: ResignationStatus.WITHDRAWN },
      }),
      this.prisma.employee.update({
        where: { id: employee.id },
        data: { status: EmployeeStatus.ACTIVE },
      }),
    ]);
    return { status: ResignationStatus.WITHDRAWN };
  }

  async mine(tenantId: string, userId: string) {
    const employee = await this.employeeForUser(userId);
    return this.prisma.resignation.findFirst({
      where: { tenantId, employeeId: employee.id },
      include: {
        clearances: { include: { department: { select: { name: true } } } },
        settlement: true,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.resignation.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            employeeCode: true,
            designation: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        clearances: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // 2. HR settles the last working day (post approval-chain acceptance).
  async accept(tenantId: string, id: string, dto: AcceptResignationDto) {
    const resignation = await this.get(tenantId, id);
    if (
      ![ResignationStatus.SUBMITTED, ResignationStatus.APPROVAL, ResignationStatus.ACCEPTED].includes(
        resignation.status as any,
      )
    ) {
      throw new BadRequestException('Resignation is not in an acceptable state');
    }
    return this.prisma.resignation.update({
      where: { id },
      data: {
        status: ResignationStatus.ACCEPTED,
        agreedLastDay: new Date(dto.agreedLastDay),
      },
    });
  }

  // 3. Kick off departmental NOCs — one clearance per department,
  //    assigned to its head (who may delegate).
  async initClearances(tenantId: string, id: string) {
    const resignation = await this.get(tenantId, id);
    if (resignation.status !== ResignationStatus.ACCEPTED) {
      throw new BadRequestException('Resignation must be accepted first');
    }
    const departments = await this.prisma.department.findMany({
      where: { tenantId },
    });
    if (departments.length === 0) {
      throw new BadRequestException('No departments configured for clearance');
    }
    for (const dept of departments) {
      await this.prisma.exitClearance.upsert({
        where: {
          resignationId_departmentId: {
            resignationId: id,
            departmentId: dept.id,
          },
        },
        create: {
          tenantId,
          resignationId: id,
          departmentId: dept.id,
          assigneeId: dept.headId,
        },
        update: {},
      });
    }
    await this.prisma.resignation.update({
      where: { id },
      data: { status: ResignationStatus.CLEARANCE },
    });
    return this.prisma.exitClearance.findMany({
      where: { resignationId: id },
      include: { department: { select: { name: true } } },
    });
  }

  // Clearances waiting on me (department head or delegate).
  async myClearances(tenantId: string, userId: string) {
    const employee = await this.employeeForUser(userId);
    return this.prisma.exitClearance.findMany({
      where: {
        tenantId,
        assigneeId: employee.id,
        status: { in: [ClearanceStatus.PENDING, ClearanceStatus.IN_PROGRESS] },
      },
      include: {
        department: { select: { name: true } },
        resignation: {
          include: {
            employee: {
              select: {
                employeeCode: true,
                user: { select: { firstName: true, lastName: true } },
                assetAssignments: {
                  where: { returnedAt: null },
                  include: { asset: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async signOffClearance(
    tenantId: string,
    userId: string,
    clearanceId: string,
    approve: boolean,
    dto: ClearanceActionDto,
  ) {
    const employee = await this.employeeForUser(userId);
    const clearance = await this.prisma.exitClearance.findFirst({
      where: { id: clearanceId, tenantId },
    });
    if (!clearance) throw new NotFoundException('Clearance not found');
    if (clearance.assigneeId !== employee.id) {
      throw new ForbiddenException('This clearance is not assigned to you');
    }

    const updated = await this.prisma.exitClearance.update({
      where: { id: clearanceId },
      data: {
        status: approve ? ClearanceStatus.SIGNED_OFF : ClearanceStatus.REJECTED,
        remarks: dto.remarks,
        signedOffBy: userId,
        signedOffAt: approve ? new Date() : null,
      },
    });

    // All departments signed off → ready for full & final.
    if (approve) {
      const open = await this.prisma.exitClearance.count({
        where: {
          resignationId: clearance.resignationId,
          status: { not: ClearanceStatus.SIGNED_OFF },
        },
      });
      if (open === 0) {
        await this.prisma.resignation.update({
          where: { id: clearance.resignationId },
          data: { status: ResignationStatus.FNF },
        });
      }
    }
    return updated;
  }

  // Department head hands the clearance to a subordinate.
  async delegateClearance(
    tenantId: string,
    userId: string,
    clearanceId: string,
    dto: DelegateClearanceDto,
  ) {
    const employee = await this.employeeForUser(userId);
    const clearance = await this.prisma.exitClearance.findFirst({
      where: { id: clearanceId, tenantId },
    });
    if (!clearance) throw new NotFoundException('Clearance not found');
    if (clearance.assigneeId !== employee.id) {
      throw new ForbiddenException('This clearance is not assigned to you');
    }
    return this.prisma.exitClearance.update({
      where: { id: clearanceId },
      data: { assigneeId: dto.assigneeId, status: ClearanceStatus.IN_PROGRESS },
    });
  }

  // 4. Full & final settlement.
  async recordFnf(tenantId: string, id: string, dto: FnfDto) {
    const resignation = await this.get(tenantId, id);
    if (resignation.status !== ResignationStatus.FNF) {
      throw new BadRequestException('All clearances must be signed off first');
    }
    return this.prisma.fullFinalSettlement.upsert({
      where: { resignationId: id },
      create: {
        tenantId,
        resignationId: id,
        breakup: dto.breakup as any,
        netPayable: dto.netPayable,
      },
      update: { breakup: dto.breakup as any, netPayable: dto.netPayable },
    });
  }

  // 5. Settle & release: employee exits; letters recorded against the case.
  //    (PDF letter generation plugs in here — fileIds are recorded now.)
  async release(
    tenantId: string,
    id: string,
    releaseLetterFileId?: string,
    fnfLetterFileId?: string,
  ) {
    const resignation = await this.get(tenantId, id);
    const settlement = await this.prisma.fullFinalSettlement.findUnique({
      where: { resignationId: id },
    });
    if (resignation.status !== ResignationStatus.FNF || !settlement) {
      throw new BadRequestException('Full & final settlement must be recorded first');
    }
    await this.prisma.$transaction([
      this.prisma.fullFinalSettlement.update({
        where: { resignationId: id },
        data: { settledAt: new Date(), letterFileId: fnfLetterFileId },
      }),
      this.prisma.resignation.update({
        where: { id },
        data: {
          status: ResignationStatus.RELEASED,
          releaseLetterFileId,
        },
      }),
      this.prisma.employee.update({
        where: { id: resignation.employeeId },
        data: { status: EmployeeStatus.EXITED },
      }),
    ]);
    return { status: ResignationStatus.RELEASED };
  }

  private async get(tenantId: string, id: string) {
    const r = await this.prisma.resignation.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Resignation not found');
    return r;
  }

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }
}

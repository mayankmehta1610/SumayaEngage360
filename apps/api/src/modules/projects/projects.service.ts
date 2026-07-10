import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AllocateDto, CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        tenantId,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: ProjectStatus.ACTIVE,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: {
        client: { select: { name: true, isInternal: true } },
        _count: { select: { allocations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        allocations: {
          where: { endDate: null },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                designation: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(tenantId, id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  // Percentage-based allocation. The project manager becomes the employee's
  // reporting manager on their first live allocation (per spec: manager is
  // assigned when the employee joins a project).
  async allocate(tenantId: string, projectId: string, dto: AllocateDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const live = await this.prisma.projectAllocation.aggregate({
      where: { tenantId, employeeId: dto.employeeId, endDate: null },
      _sum: { percentage: true },
    });
    const total = (live._sum.percentage ?? 0) + dto.percentage;
    if (total > 100) {
      throw new BadRequestException(
        `Allocation exceeds 100% (current ${live._sum.percentage ?? 0}%, requested ${dto.percentage}%)`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.projectAllocation.create({
        data: {
          tenantId,
          projectId,
          employeeId: dto.employeeId,
          percentage: dto.percentage,
          billable: dto.billable ?? true,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });
      if (!employee.managerId && project.managerId) {
        await tx.employee.update({
          where: { id: dto.employeeId },
          data: { managerId: project.managerId },
        });
      }
      return allocation;
    });
  }

  async endAllocation(tenantId: string, allocationId: string) {
    const alloc = await this.prisma.projectAllocation.findFirst({
      where: { id: allocationId, tenantId },
    });
    if (!alloc) throw new NotFoundException('Allocation not found');
    return this.prisma.projectAllocation.update({
      where: { id: allocationId },
      data: { endDate: new Date() },
    });
  }

  employeeAllocations(tenantId: string, employeeId: string) {
    return this.prisma.projectAllocation.findMany({
      where: { tenantId, employeeId },
      include: { project: { select: { name: true, code: true, location: true } } },
      orderBy: { startDate: 'desc' },
    });
  }
}

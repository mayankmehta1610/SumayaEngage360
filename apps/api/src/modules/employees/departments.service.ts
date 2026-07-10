import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto, CreateDesignationDto } from './employees.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: { tenantId, ...dto } });
  }

  listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async setHead(tenantId: string, id: string, headId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: { headId } });
  }

  createDesignation(tenantId: string, dto: CreateDesignationDto) {
    return this.prisma.designation.create({
      data: { tenantId, name: dto.name, level: dto.level ?? 0 },
    });
  }

  listDesignations(tenantId: string) {
    return this.prisma.designation.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' },
    });
  }
}

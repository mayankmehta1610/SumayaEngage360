import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManpowerService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return Promise.all([
      this.prisma.manpowerRequest.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.department.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]).then(([requests, departments]) => {
      const names = new Map(departments.map((department) => [department.id, department.name]));
      return requests.map((request) => ({ ...request, departmentName: request.departmentId ? names.get(request.departmentId) : null }));
    });
  }

  create(tenantId: string, requestedBy: string, dto: {
    title: string; description?: string; headcount: number; departmentId?: string; budget?: number;
    justification?: string; location?: string; employmentType?: string; minExperience?: number;
    maxExperience?: number; skills?: string[];
  }) {
    return this.prisma.manpowerRequest.create({
      data: {
        tenantId,
        requestedBy,
        ...dto,
        description: dto.description?.trim() || dto.title,
        location: dto.location?.trim() || 'To be determined',
        employmentType: dto.employmentType ?? 'FULL_TIME',
        skills: dto.skills ?? [],
      },
    });
  }

  async submit(tenantId: string, id: string) {
    const req = await this.find(tenantId, id);
    if (req.status !== 'DRAFT') throw new BadRequestException('Already submitted');
    return this.prisma.manpowerRequest.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  async approve(tenantId: string, id: string, approvedBy: string) {
    const req = await this.find(tenantId, id);
    if (req.status !== 'SUBMITTED') throw new BadRequestException('Not in submitted state');
    if (req.maxExperience != null && req.minExperience != null && req.maxExperience < req.minExperience) {
      throw new BadRequestException('Maximum experience cannot be less than minimum experience');
    }
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          tenantId,
          title: req.title,
          description: req.description,
          vacancies: req.headcount,
          headcountBudget: req.budget,
          location: req.location,
          employmentType: req.employmentType,
          minExperience: req.minExperience,
          maxExperience: req.maxExperience,
          skills: {
            create: req.skills.map((name) => ({
              skill: {
                connectOrCreate: {
                  where: { tenantId_name: { tenantId, name } },
                  create: { tenantId, name },
                },
              },
            })),
          },
        },
      });
      return tx.manpowerRequest.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy, jobId: job.id },
      });
    });
  }

  async reject(tenantId: string, id: string) {
    const req = await this.find(tenantId, id);
    if (req.status !== 'SUBMITTED') throw new BadRequestException('Only submitted requests can be rejected');
    return this.prisma.manpowerRequest.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  private async find(tenantId: string, id: string) {
    const req = await this.prisma.manpowerRequest.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Manpower request not found');
    return req;
  }
}

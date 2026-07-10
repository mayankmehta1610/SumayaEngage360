import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './ats.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateJobDto) {
    const { skills = [], interviewPlan, ...data } = dto;
    return this.prisma.job.create({
      data: {
        tenantId,
        ...data,
        interviewPlan: interviewPlan as any,
        skills: {
          create: await Promise.all(
            skills.map(async (name) => ({
              skill: {
                connectOrCreate: {
                  where: { tenantId_name: { tenantId, name } },
                  create: { tenantId, name },
                },
              },
            })),
          ),
        },
      },
      include: { skills: { include: { skill: true } } },
    });
  }

  findAll(tenantId: string, status?: JobStatus) {
    return this.prisma.job.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        hiringClient: { select: { id: true, name: true, slug: true } },
        skills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, tenantId },
      include: {
        hiringClient: true,
        skills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    await this.findOne(tenantId, id);
    return this.prisma.job.update({ where: { id }, data: dto });
  }

  async publish(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.PUBLISHED },
    });
  }
}

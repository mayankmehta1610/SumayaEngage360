import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHiringClientDto, UpdateHiringClientDto } from './ats.dto';

@Injectable()
export class HiringClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateHiringClientDto) {
    const dup = await this.prisma.hiringClient.findUnique({
      where: { tenantId_slug: { tenantId, slug: dto.slug } },
    });
    if (dup) throw new ConflictException('Slug already in use for this tenant');
    return this.prisma.hiringClient.create({ data: { tenantId, ...dto } });
  }

  findAll(tenantId: string) {
    return this.prisma.hiringClient.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.hiringClient.findFirst({
      where: { id, tenantId },
      include: { jobs: { where: { status: { not: 'CLOSED' } } } },
    });
    if (!client) throw new NotFoundException('Hiring client not found');
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateHiringClientDto) {
    await this.findOne(tenantId, id);
    return this.prisma.hiringClient.update({ where: { id }, data: dto });
  }
}

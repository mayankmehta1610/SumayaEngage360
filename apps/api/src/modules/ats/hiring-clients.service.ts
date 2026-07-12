import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { parseListPaging } from '../../common/http/prisma-list';
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

  async findAll(
    tenantId: string,
    page?: string,
    pageSize?: string,
    sortBy?: string,
    sortDir?: string,
    search?: string,
    filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const q = filters.__search ?? search?.trim();
    const where: Prisma.HiringClientWhereInput = {
      tenantId,
      ...(filters.name ? { name: contains(filters.name) } : {}),
      ...(filters.slug ? { slug: contains(filters.slug) } : {}),
      ...(q
        ? { OR: [{ name: contains(q) }, { slug: contains(q) }] }
        : {}),
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.HiringClientOrderByWithRelationInput =
      sortBy === 'slug' ? { slug: dir } : sortBy === 'name' ? { name: dir } : { createdAt: dir };
    const { paginated, p, ps } = parseListPaging(page, pageSize);
    if (!paginated) {
      return this.prisma.hiringClient.findMany({ where, orderBy });
    }
    const [data, total] = await Promise.all([
      this.prisma.hiringClient.findMany({ where, orderBy, skip: (p - 1) * ps, take: ps }),
      this.prisma.hiringClient.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
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

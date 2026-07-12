import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AgencyContactType,
  AgencySubmissionStatus,
  Role,
  TenantType,
} from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { paginatedResponse, parseFilterJson, parseSortDir, contains } from '../../common/http/list-sort-filter';
import { parseListPaging } from '../../common/http/prisma-list';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class CreateSubmissionDto {
  @IsOptional()
  @IsUUID()
  clientTenantId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsUUID()
  candidateId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateSubmissionDto {
  @IsOptional()
  @IsEnum(AgencySubmissionStatus)
  status?: AgencySubmissionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpsertContactDto {
  @IsOptional()
  @IsEnum(AgencyContactType)
  type?: AgencyContactType;

  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('agency')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class AgencyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('client-tenants')
  listClientTenants(@TenantId() tenantId: string) {
    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        tenantType: TenantType.COMPANY,
        NOT: { id: tenantId },
      },
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('clients')
  async listClients(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const q = filters.__search ?? search?.trim();
    const where = {
      tenantId,
      isActive: true,
      ...(filters.name ? { name: contains(filters.name) } : {}),
      ...(q ? { name: contains(q) } : {}),
    };
    const dir = parseSortDir(sortDir);
    const orderBy = sortBy === 'name' ? { name: dir } : { createdAt: dir };
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

  @Get('submissions')
  async listSubmissions(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('candidateId') candidateId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const q = filters.__search ?? search?.trim();
    const p = Math.max(1, page ? parseInt(page, 10) : 1);
    const ps = Math.min(200, Math.max(1, pageSize ? parseInt(pageSize, 10) : 50));
    const dir = parseSortDir(sortDir);
    const where = {
      agencyTenantId: tenantId,
      ...(status ? { status: status.toUpperCase() as AgencySubmissionStatus } : {}),
      ...(candidateId ? { candidateId } : {}),
      ...(filters.client ? { clientName: contains(filters.client) } : {}),
      ...(q
        ? {
            OR: [
              { clientName: contains(q) },
              { candidate: { firstName: contains(q) } },
              { candidate: { lastName: contains(q) } },
            ],
          }
        : {}),
    };
    const orderBy = sortBy === 'status' ? { status: dir } : { createdAt: dir };
    const [data, total] = await Promise.all([
      this.prisma.agencyClientSubmission.findMany({
        where,
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.agencyClientSubmission.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Post('submissions')
  createSubmission(@TenantId() tenantId: string, @Body() dto: CreateSubmissionDto) {
    return this.prisma.agencyClientSubmission.create({
      data: {
        agencyTenantId: tenantId,
        clientTenantId: dto.clientTenantId,
        clientName: dto.clientName,
        jobId: dto.jobId,
        candidateId: dto.candidateId,
        notes: dto.notes,
        status: AgencySubmissionStatus.DRAFT,
      },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  @Patch('submissions/:id')
  async updateSubmission(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    const existing = await this.prisma.agencyClientSubmission.findFirst({
      where: { id, agencyTenantId: tenantId },
    });
    if (!existing) throw new NotFoundException('Submission not found');
    const submittedAt =
      dto.status === AgencySubmissionStatus.SUBMITTED && !existing.submittedAt
        ? new Date()
        : existing.submittedAt;
    return this.prisma.agencyClientSubmission.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        submittedAt,
      },
    });
  }

  @Get('contacts')
  async listContacts(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const q = filters.__search ?? search?.trim();
    const where = {
      tenantId,
      isActive: true,
      ...(filters.name ? { name: contains(filters.name) } : {}),
      ...(filters.company ? { company: contains(filters.company) } : {}),
      ...(filters.type ? { type: filters.type.toUpperCase() as AgencyContactType } : {}),
      ...(q
        ? {
            OR: [
              { name: contains(q) },
              { email: contains(q) },
              { company: contains(q) },
            ],
          }
        : {}),
    };
    const dir = parseSortDir(sortDir);
    const orderBy =
      sortBy === 'name' ? { name: dir } : sortBy === 'company' ? { company: dir } : { createdAt: dir };
    const { paginated, p, ps } = parseListPaging(page, pageSize);
    if (!paginated) {
      return this.prisma.agencyContact.findMany({ where, orderBy });
    }
    const [data, total] = await Promise.all([
      this.prisma.agencyContact.findMany({ where, orderBy, skip: (p - 1) * ps, take: ps }),
      this.prisma.agencyContact.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Post('contacts')
  createContact(@TenantId() tenantId: string, @Body() dto: UpsertContactDto) {
    return this.prisma.agencyContact.create({
      data: {
        tenantId,
        type: dto.type ?? AgencyContactType.CLIENT,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        notes: dto.notes,
      },
    });
  }

  @Patch('contacts/:id')
  updateContact(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertContactDto>,
  ) {
    return this.prisma.agencyContact.update({
      where: { id, tenantId },
      data: dto,
    });
  }
}

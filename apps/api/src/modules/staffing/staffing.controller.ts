import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContractorStatus, Role } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { paginatedResponse, parseFilterJson, parseSortDir, contains } from '../../common/http/list-sort-filter';
import { parseListPaging } from '../../common/http/prisma-list';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class CreateContractorDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsString()
  clientRef?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsString()
  rateType?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateContractorDto {
  @IsOptional()
  @IsEnum(ContractorStatus)
  status?: ContractorStatus;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateContractDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsString()
  clientRef?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  terms?: string;
}

@Controller()
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class StaffingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('contracts')
  async listContracts(
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
      ...(filters.clientRef ? { clientRef: contains(filters.clientRef) } : {}),
      ...(q ? { clientRef: contains(q) } : {}),
    };
    const dir = parseSortDir(sortDir);
    const orderBy =
      sortBy === 'client' ? { clientRef: dir } : sortBy === 'value' ? { value: dir } : { startDate: dir };
    const include = { project: { select: { id: true, name: true, code: true } } };
    const { paginated, p, ps } = parseListPaging(page, pageSize);
    if (!paginated) {
      return this.prisma.projectContract.findMany({ where, include, orderBy });
    }
    const [data, total] = await Promise.all([
      this.prisma.projectContract.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.projectContract.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Post('contracts')
  createContract(@TenantId() tenantId: string, @Body() dto: CreateContractDto) {
    return this.prisma.projectContract.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        clientRef: dto.clientRef,
        value: dto.value,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        terms: dto.terms,
      },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
  }

  @Get('contractors')
  async listContractors(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const p = Math.max(1, page ? parseInt(page, 10) : 1);
    const ps = Math.min(200, Math.max(1, pageSize ? parseInt(pageSize, 10) : 50));
    const dir = parseSortDir(sortDir);
    const where = {
      tenantId,
      ...(status ? { status: status.toUpperCase() as ContractorStatus } : {}),
    };
    const orderBy = sortBy === 'status' ? { status: dir } : { startDate: dir };
    const [data, total] = await Promise.all([
      this.prisma.contractorAssignment.findMany({
        where,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.contractorAssignment.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Post('contractors')
  createContractor(@TenantId() tenantId: string, @Body() dto: CreateContractorDto) {
    return this.prisma.contractorAssignment.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        candidateId: dto.candidateId,
        contractId: dto.contractId,
        clientRef: dto.clientRef,
        role: dto.role,
        rate: dto.rate,
        rateType: dto.rateType ?? 'HOURLY',
        currency: dto.currency ?? 'INR',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  @Patch('contractors/:id')
  updateContractor(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractorDto,
  ) {
    return this.prisma.contractorAssignment.update({
      where: { id, tenantId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.rate !== undefined ? { rate: dto.rate } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }
}

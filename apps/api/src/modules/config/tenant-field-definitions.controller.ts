import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role, TenantFieldType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { parseListPaging } from '../../common/http/prisma-list';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class UpsertFieldDefinitionDto {
  @IsString()
  entity: string;

  @IsString()
  fieldKey: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsEnum(TenantFieldType)
  type?: TenantFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  options?: unknown;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('tenant-field-definitions')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class TenantFieldDefinitionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('entity') entity?: string,
    @Query('filter') filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where = {
      tenantId,
      isActive: true,
      ...(entity ? { entity: entity.toUpperCase() } : {}),
      ...(filters.entity ? { entity: filters.entity.toUpperCase() } : {}),
      ...(filters.label ? { label: contains(filters.label) } : {}),
    };
    const dir = parseSortDir(sortDir);
    const orderBy =
      sortBy === 'label'
        ? { label: dir }
        : sortBy === 'entity'
          ? { entity: dir }
          : [{ entity: 'asc' as const }, { sortOrder: 'asc' as const }, { label: dir }];
    const { paginated, p, ps } = parseListPaging(page, pageSize);
    if (!paginated) {
      return this.prisma.tenantFieldDefinition.findMany({ where, orderBy });
    }
    const [data, total] = await Promise.all([
      this.prisma.tenantFieldDefinition.findMany({
        where,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.tenantFieldDefinition.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Get('entity/:entity')
  listForEntity(
    @TenantId() tenantId: string,
    @Param('entity') entity?: string,
  ) {
    return this.prisma.tenantFieldDefinition.findMany({
      where: {
        tenantId,
        ...(entity ? { entity: entity.toUpperCase() } : {}),
        isActive: true,
      },
      orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: UpsertFieldDefinitionDto) {
    return this.prisma.tenantFieldDefinition.create({
      data: {
        tenantId,
        entity: dto.entity.toUpperCase(),
        fieldKey: dto.fieldKey,
        label: dto.label,
        type: dto.type ?? TenantFieldType.TEXT,
        required: dto.required ?? false,
        options: dto.options as any,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertFieldDefinitionDto>,
  ) {
    return this.prisma.tenantFieldDefinition.update({
      where: { id, tenantId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.options !== undefined ? { options: dto.options as any } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.tenantFieldDefinition.update({
      where: { id, tenantId },
      data: { isActive: false },
    });
  }
}

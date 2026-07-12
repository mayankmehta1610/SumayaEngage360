import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role, TenantFieldType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
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
  listAll(@TenantId() tenantId: string) {
    return this.prisma.tenantFieldDefinition.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
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

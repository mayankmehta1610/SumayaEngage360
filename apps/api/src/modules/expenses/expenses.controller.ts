import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

class LineDto {
  @IsDateString() date: string;
  @IsString() category: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() receiptFileId?: string;
}

class ClaimDto {
  @IsString() title: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineDto) lines: LineDto[];
}

@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  list(@TenantId() t: string) {
    return this.expenses.list(t);
  }

  @Get('mine')
  async mine(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    const e = await this.prisma.employee.findFirst({ where: { tenantId: t, userId: u.sub } });
    return e ? this.expenses.list(t, e.id) : [];
  }

  @Post()
  async create(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Body() dto: ClaimDto) {
    const e = await this.prisma.employee.findFirstOrThrow({ where: { tenantId: t, userId: u.sub } });
    return this.expenses.create(t, e.id, dto);
  }

  @Patch(':id/submit')
  async submit(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Param('id') id: string) {
    const e = await this.prisma.employee.findFirstOrThrow({ where: { tenantId: t, userId: u.sub } });
    return this.expenses.submit(t, id, e.id);
  }

  @Patch(':id/approve')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  approve(@TenantId() t: string, @Param('id') id: string) {
    return this.expenses.approve(t, id);
  }

  @Patch(':id/reject')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  reject(@TenantId() t: string, @Param('id') id: string) {
    return this.expenses.reject(t, id);
  }
}

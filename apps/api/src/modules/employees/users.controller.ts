import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { contains, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles: Role[];
}

class UpdateUserAccessDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Tenant user administration: HR accounts, interviewers, BGC vendor logins…
@Controller('users')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN)
  async create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    if (dto.roles.includes(Role.PLATFORM_ADMIN)) {
      throw new ConflictException('Cannot grant PLATFORM_ADMIN');
    }
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.users.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existing) throw new ConflictException('User already exists');
    const user = await this.prisma.users.create({
      data: {
        tenantId,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: dto.roles,
      },
    });
    return { id: user.id, email: user.email, roles: user.roles };
  }

  @Get()
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where: Prisma.UsersWhereInput = { tenantId };
    if (filters.name) {
      where.OR = [
        { firstName: contains(filters.name) },
        { lastName: contains(filters.name) },
      ];
    }
    if (filters.email) where.email = contains(filters.email);
    if (filters.roles) where.roles = { has: filters.roles.toUpperCase() as Role };
    if (filters.active) {
      const val = filters.active.toLowerCase();
      if (val === 'active' || val === 'true' || val === 'yes') where.isActive = true;
      if (val === 'disabled' || val === 'false' || val === 'no') where.isActive = false;
    }
    if (filters.__search) {
      const q = filters.__search;
      where.OR = [
        { firstName: contains(q) },
        { lastName: contains(q) },
        { email: contains(q) },
      ];
    }
    const select = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      roles: true,
      isActive: true,
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.UsersOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'name': return { lastName: dir };
        case 'email': return { email: dir };
        case 'active': return { isActive: dir };
        default: return { createdAt: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    if (!paginated) {
      return this.prisma.users.findMany({ where, select, orderBy });
    }
    const p = Math.max(1, page ? parseInt(page, 10) : 1);
    const ps = Math.min(200, Math.max(1, pageSize ? parseInt(pageSize, 10) : 50));
    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        select,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.users.count({ where }),
    ]);
    return {
      data,
      meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) || 1 },
    };
  }

  @Patch(':id/access')
  @Roles(Role.TENANT_ADMIN)
  async updateAccess(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateUserAccessDto,
  ) {
    if (id === actor.sub) {
      throw new ForbiddenException('Use another tenant admin to change your own access');
    }
    if (dto.roles?.includes(Role.PLATFORM_ADMIN)) {
      throw new ConflictException('Cannot grant PLATFORM_ADMIN');
    }
    const user = await this.prisma.users.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.users.update({
      where: { id },
      data: {
        ...(dto.roles ? { roles: dto.roles } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
      },
    });
  }
}

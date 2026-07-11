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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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
  list(@TenantId() tenantId: string) {
    return this.prisma.users.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
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

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TenantType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { defaultPortalsForType } from '../../common/tenant/tenant-portals';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTenantDto,
  OnboardingWizardDto,
  PatchOnboardingDto,
  UpdateTenantDto,
} from './tenants.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });
    if (existing) throw new ConflictException('Subdomain already taken');

    const tenantType = dto.tenantType ?? TenantType.COMPANY;
    const enabledPortals = dto.enabledPortals ?? defaultPortalsForType(tenantType);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          subdomain: dto.subdomain,
          tenantType,
          onboardingQuestionnaire: dto.onboardingQuestionnaire as any,
          enabledPortals: enabledPortals as any,
          country: dto.country ?? 'IN',
          currency: dto.currency ?? 'INR',
          timezone: dto.timezone ?? 'Asia/Kolkata',
        },
      });
      await tx.users.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase(),
          passwordHash: await bcrypt.hash(dto.adminPassword, 10),
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          roles: [Role.TENANT_ADMIN],
        },
      });
      return tenant;
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        onboardingQuestionnaire: dto.onboardingQuestionnaire as any,
        enabledPortals: dto.enabledPortals as any,
      },
    });
  }

  async completeOnboardingWizard(tenantId: string, dto: OnboardingWizardDto) {
    await this.findOne(tenantId);
    const enabledPortals =
      dto.enabledPortals ?? defaultPortalsForType(dto.tenantType);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        tenantType: dto.tenantType,
        onboardingQuestionnaire: dto.questionnaire as any,
        enabledPortals: enabledPortals as any,
      },
    });
  }

  async patchOnboarding(tenantId: string, dto: PatchOnboardingDto) {
    const tenant = await this.findOne(tenantId);
    const existing = (tenant.onboardingQuestionnaire as Record<string, unknown>) ?? {};
    const questionnaire = dto.questionnaire
      ? { ...existing, ...dto.questionnaire }
      : existing;
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        onboardingQuestionnaire: questionnaire as any,
        ...(dto.enabledPortals ? { enabledPortals: dto.enabledPortals as any } : {}),
      },
    });
  }
}

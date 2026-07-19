import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JURISDICTIONS, JurisdictionField, SUPPORTED_JURISDICTION_CODES, jurisdiction } from './jurisdiction.catalog';
import { ConfigureJurisdictionsDto, CreateWorkAuthorizationDto, UpdateWorkAuthorizationDto, UpsertEmployerProfileDto, UpsertJurisdictionProfileDto } from './jurisdictions.dto';

const CASE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ASSESSMENT', 'REJECTED', 'CLOSED'],
  ASSESSMENT: ['DOCUMENTS_PENDING', 'SPONSORSHIP', 'VERIFICATION_PENDING', 'REJECTED', 'CLOSED'],
  DOCUMENTS_PENDING: ['ASSESSMENT', 'SPONSORSHIP', 'VERIFICATION_PENDING', 'REJECTED', 'CLOSED'],
  SPONSORSHIP: ['DOCUMENTS_PENDING', 'VERIFICATION_PENDING', 'REJECTED', 'CLOSED'],
  VERIFICATION_PENDING: ['DOCUMENTS_PENDING', 'VERIFIED', 'REJECTED', 'CLOSED'],
  VERIFIED: ['DOCUMENTS_PENDING', 'CLOSED'],
  REJECTED: ['ASSESSMENT', 'CLOSED'],
  CLOSED: [],
};

@Injectable()
export class JurisdictionsService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return Object.values(JURISDICTIONS);
  }

  async tenantConfiguration(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const codes = this.codes(tenant.operatingCountries, tenant.country);
    return { primaryCountry: tenant.country, operatingCountries: codes, jurisdictions: codes.map((code) => JURISDICTIONS[code]).filter(Boolean) };
  }

  async configureTenant(tenantId: string, dto: ConfigureJurisdictionsDto) {
    const codes = [...new Set(dto.operatingCountries.map((code) => code.trim().toUpperCase()))];
    const primary = dto.primaryCountry.trim().toUpperCase();
    if (!codes.includes(primary)) codes.unshift(primary);
    this.validateCodes(codes);
    const primaryDefinition = JURISDICTIONS[primary];
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { country: primary, operatingCountries: codes as any, currency: primaryDefinition.currency, timezone: primaryDefinition.timezone },
      });
      for (const code of codes) {
        const definition = JURISDICTIONS[code];
        await tx.countryConfig.upsert({
          where: { tenantId_country: { tenantId, country: code } },
          create: { tenantId, country: code, settings: definition as any },
          update: { settings: definition as any },
        });
        for (const [index, field] of definition.candidateFields.entries()) {
          await tx.tenantFieldDefinition.upsert({
            where: { tenantId_entity_fieldKey: { tenantId, entity: `CANDIDATE_${code}`, fieldKey: field.key } },
            create: { tenantId, entity: `CANDIDATE_${code}`, fieldKey: field.key, label: field.label, type: field.type, required: field.required ?? false, options: field.options as any, sortOrder: index },
            update: { label: field.label, type: field.type, required: field.required ?? false, options: field.options as any, sortOrder: index, isActive: true },
          });
        }
      }
      return { tenant, operatingCountries: codes, jurisdictions: codes.map((code) => JURISDICTIONS[code]) };
    });
  }

  async candidateOverview(tenantId: string, candidateId: string) {
    await this.requireCandidate(tenantId, candidateId);
    const [profiles, authorizations] = await Promise.all([
      this.prisma.candidateJurisdictionProfile.findMany({ where: { tenantId, candidateId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.workAuthorizationCase.findMany({ where: { tenantId, candidateId }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { profiles, authorizations };
  }

  async listEmployerProfiles(tenantId: string, jurisdictionCode?: string) {
    return this.prisma.jurisdictionEmployerProfile.findMany({
      where: { tenantId, ...(jurisdictionCode ? { jurisdictionCode: jurisdictionCode.trim().toUpperCase() } : {}) },
      orderBy: [{ jurisdictionCode: 'asc' }, { profileName: 'asc' }],
    });
  }

  async upsertEmployerProfile(tenantId: string, actorId: string, dto: UpsertEmployerProfileDto) {
    const definition = await this.requireEnabled(tenantId, dto.jurisdictionCode, dto.memberStateCode);
    this.validateRequiredFields(definition.employerFields, {
      ...(dto.data ?? {}), ...(dto.identifiers ?? {}), ...(dto.registrations ?? {}), ...(dto.contacts ?? {}),
    }, dto.completionStatus, `${definition.name} employer`);
    const jurisdictionCode = definition.code;
    const memberStateCode = dto.memberStateCode?.trim().toUpperCase() ?? '';
    const profileName = dto.profileName.trim();
    if (!profileName) throw new BadRequestException('Employer profile name is required');
    const verified = dto.completionStatus === 'VERIFIED';
    return this.prisma.jurisdictionEmployerProfile.upsert({
      where: { tenantId_jurisdictionCode_memberStateCode_profileName: { tenantId, jurisdictionCode, memberStateCode, profileName } },
      create: { tenantId, jurisdictionCode, memberStateCode, profileName, legalEntityId: dto.legalEntityId, locationId: dto.locationId, data: dto.data as any, identifiers: dto.identifiers as any, registrations: dto.registrations as any, contacts: dto.contacts as any, completionStatus: dto.completionStatus ?? 'DRAFT', verifiedBy: verified ? actorId : undefined, verifiedAt: verified ? new Date() : undefined, reviewDueAt: dto.reviewDueAt ? new Date(dto.reviewDueAt) : undefined },
      update: { legalEntityId: dto.legalEntityId, locationId: dto.locationId, data: dto.data as any, identifiers: dto.identifiers as any, registrations: dto.registrations as any, contacts: dto.contacts as any, completionStatus: dto.completionStatus ?? 'DRAFT', verifiedBy: verified ? actorId : undefined, verifiedAt: verified ? new Date() : undefined, reviewDueAt: dto.reviewDueAt ? new Date(dto.reviewDueAt) : undefined },
    });
  }

  async upsertProfile(tenantId: string, candidateId: string, dto: UpsertJurisdictionProfileDto) {
    await this.requireCandidate(tenantId, candidateId);
    const definition = await this.requireEnabled(tenantId, dto.jurisdictionCode, dto.memberStateCode);
    this.validateProfileCompletion(definition.candidateFields, dto);
    const memberStateCode = dto.memberStateCode?.trim().toUpperCase() ?? '';
    const completedAt = dto.completionStatus === 'COMPLETE' ? new Date() : undefined;
    return this.prisma.candidateJurisdictionProfile.upsert({
      where: { tenantId_candidateId_jurisdictionCode_memberStateCode: { tenantId, candidateId, jurisdictionCode: dto.jurisdictionCode, memberStateCode } },
      create: { tenantId, candidateId, jurisdictionCode: dto.jurisdictionCode, memberStateCode, nationality: dto.nationality, residenceCountry: dto.residenceCountry, personalData: dto.personalData as any, identifiers: dto.identifiers as any, emergencyContacts: dto.emergencyContacts as any, consents: dto.consents as any, completionStatus: dto.completionStatus ?? 'DRAFT', completedAt },
      update: { nationality: dto.nationality, residenceCountry: dto.residenceCountry, personalData: dto.personalData as any, identifiers: dto.identifiers as any, emergencyContacts: dto.emergencyContacts as any, consents: dto.consents as any, completionStatus: dto.completionStatus ?? 'DRAFT', completedAt },
    });
  }

  async listCases(tenantId: string, jurisdictionCode?: string, status?: string) {
    return this.prisma.workAuthorizationCase.findMany({
      where: { tenantId, ...(jurisdictionCode ? { jurisdictionCode: jurisdictionCode.toUpperCase() } : {}), ...(status ? { status } : {}) },
      include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createCase(tenantId: string, dto: CreateWorkAuthorizationDto) {
    await this.requireCandidate(tenantId, dto.candidateId);
    const definition = await this.requireEnabled(tenantId, dto.jurisdictionCode, dto.memberStateCode);
    const option = definition.authorizationTypes.find((item) => item.code === dto.authorizationType);
    if (!option) throw new BadRequestException(`Unsupported authorization type ${dto.authorizationType} for ${definition.name}`);
    const caseNumber = `WA-${dto.jurisdictionCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return this.prisma.workAuthorizationCase.create({
      data: { tenantId, candidateId: dto.candidateId, caseNumber, jurisdictionCode: dto.jurisdictionCode, memberStateCode: dto.memberStateCode, authorizationType: dto.authorizationType, sponsorshipRequired: dto.sponsorshipRequired ?? option.sponsorshipRequired ?? false, employerSpecific: dto.employerSpecific ?? option.employerSpecific ?? false, employerName: dto.employerName, jobId: dto.jobId, validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, notes: dto.notes, checklist: this.initialChecklist(definition) as any },
      include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async updateCase(tenantId: string, id: string, actorId: string, dto: UpdateWorkAuthorizationDto) {
    const existing = await this.prisma.workAuthorizationCase.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Work authorization case not found');
    if (dto.status && dto.status !== existing.status && !CASE_TRANSITIONS[existing.status]?.includes(dto.status)) {
      throw new BadRequestException(`Cannot move work authorization from ${existing.status} to ${dto.status}`);
    }
    if (dto.status === 'VERIFIED' && (!dto.verificationMethod && !existing.verificationMethod)) {
      throw new BadRequestException('Verification method is required before a case can be verified');
    }
    return this.prisma.workAuthorizationCase.update({
      where: { id },
      data: { status: dto.status, verificationMethod: dto.verificationMethod, verificationReference: dto.verificationReference, verifiedAt: dto.status === 'VERIFIED' ? (dto.verifiedAt ? new Date(dto.verifiedAt) : new Date()) : dto.verifiedAt ? new Date(dto.verifiedAt) : undefined, verifiedBy: dto.status === 'VERIFIED' ? actorId : undefined, validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, restrictions: dto.restrictions as any, checklist: dto.checklist as any, notes: dto.notes },
      include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async expiryDashboard(tenantId: string, days = 90) {
    const now = new Date();
    const until = new Date(now.getTime() + Math.min(Math.max(days, 1), 365) * 86400000);
    const cases = await this.prisma.workAuthorizationCase.findMany({ where: { tenantId, status: 'VERIFIED', expiresAt: { gte: now, lte: until } }, include: { candidate: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { expiresAt: 'asc' } });
    return { asOf: now, through: until, count: cases.length, cases };
  }

  private initialChecklist(definition: (typeof JURISDICTIONS)[string]) {
    return Object.fromEntries(definition.lifecycle.map((step) => [step, false]));
  }

  private async requireEnabled(tenantId: string, code: string, memberStateCode?: string) {
    const definition = jurisdiction(code);
    if (!definition) throw new BadRequestException(`Unsupported jurisdiction ${code}`);
    const config = await this.tenantConfiguration(tenantId);
    if (!config.operatingCountries.includes(definition.code)) throw new BadRequestException(`${definition.name} is not enabled for this tenant`);
    if (definition.memberStateRequired && !memberStateCode?.trim()) throw new BadRequestException('EU workflows require a destination member state');
    return definition;
  }

  private async requireCandidate(tenantId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({ where: { id: candidateId, tenantId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  private validateProfileCompletion(fields: JurisdictionField[], dto: UpsertJurisdictionProfileDto) {
    const values: Record<string, unknown> = {
      ...(dto.personalData ?? {}),
      ...(dto.identifiers ?? {}),
      ...(dto.nationality ? { nationality: dto.nationality } : {}),
      ...(dto.residenceCountry ? { residenceCountry: dto.residenceCountry } : {}),
    };
    this.validateRequiredFields(fields, values, dto.completionStatus, `${dto.jurisdictionCode} candidate`);
  }

  private validateRequiredFields(fields: JurisdictionField[], values: Record<string, unknown>, status: string | undefined, label: string) {
    if (!status || status === 'DRAFT') return;
    const missing = fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = values[field.key];
        if (field.type === 'BOOLEAN') return value !== true;
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || String(value).trim() === '';
      })
      .map((field) => field.label);
    if (missing.length) {
      throw new BadRequestException(
        `Complete required ${label} profile fields before review: ${missing.join(', ')}`,
      );
    }
  }

  private codes(value: unknown, primary: string) {
    const configured = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    const supported = configured.map((code) => code.toUpperCase()).filter((code) => SUPPORTED_JURISDICTION_CODES.includes(code));
    if (!supported.length && SUPPORTED_JURISDICTION_CODES.includes(primary)) supported.push(primary);
    return [...new Set(supported)];
  }

  private validateCodes(codes: string[]) {
    const invalid = codes.filter((code) => !SUPPORTED_JURISDICTION_CODES.includes(code));
    if (invalid.length) throw new BadRequestException(`Unsupported jurisdictions: ${invalid.join(', ')}`);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalEntity,
  EmployeeStatus,
  OnboardingStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { contains, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import {
  CompleteOnboardingDto,
  DocumentRequirementDto,
  OnboardingSkillsDto,
  SubmitDocumentDto,
  VerifyDocumentDto,
} from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  // ── secure-token resolution (candidate-facing, pre-login) ──────────────

  private async byToken(token: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { onboardingToken: token },
      include: { application: { include: { candidate: true } } },
    });
    if (!offer) throw new NotFoundException('Invalid onboarding link');
    const user = await this.prisma.users.findUnique({
      where: {
        tenantId_email: {
          tenantId: offer.tenantId,
          email: offer.application.candidate.email.toLowerCase(),
        },
      },
      include: { employee: true },
    });
    if (!user?.employee) throw new NotFoundException('Onboarding record not found');
    return { offer, user, employee: user.employee };
  }

  // The guided tool: everything the joiner still has to do, in one payload.
  async getPortal(token: string) {
    const { offer, employee } = await this.byToken(token);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: offer.tenantId },
    });
    const [onboardingCase, requirements, documents, skills, policies, acks] =
      await Promise.all([
        this.prisma.onboardingCase.findUnique({ where: { employeeId: employee.id } }),
        this.prisma.documentRequirement.findMany({
          where: { tenantId: tenant.id, country: tenant.country },
        }),
        this.prisma.employeeDocument.findMany({ where: { employeeId: employee.id } }),
        this.prisma.employeeSkill.findMany({
          where: { employeeId: employee.id },
          include: { skill: true },
        }),
        this.prisma.policy.findMany({
          where: { tenantId: tenant.id, isActive: true },
        }),
        this.prisma.policyAcknowledgement.findMany({
          where: { employeeId: employee.id },
        }),
      ]);
    return {
      status: onboardingCase?.status,
      employee: {
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        joinDate: employee.joinDate,
        location: employee.location,
      },
      country: tenant.country,
      // requirement list vs what's uploaded — drives the checklist UI
      requirements: requirements.map((r) => ({
        ...r,
        submitted: documents.some((d) => d.code === r.code),
      })),
      documents,
      // pre-filled from application-time tagging; joiner adds what's missing
      skills: skills.map((s) => ({
        name: s.skill.name,
        fromApplication: s.fromApplication,
      })),
      policies: policies.map((p) => ({
        id: p.id,
        title: p.title,
        version: p.version,
        mandatory: p.mandatory,
        acknowledged: acks.some((a) => a.policyId === p.id && a.version === p.version),
      })),
      // BGC intentionally absent — not visible to the employee.
    };
  }

  async submitDocument(token: string, dto: SubmitDocumentDto) {
    const { offer, employee } = await this.byToken(token);
    await this.ensureEditable(employee.id);
    return this.prisma.employeeDocument.create({
      data: {
        tenantId: offer.tenantId,
        employeeId: employee.id,
        code: dto.code.toUpperCase(),
        fileId: dto.fileId,
      },
    });
  }

  async addSkills(token: string, dto: OnboardingSkillsDto) {
    const { offer, employee } = await this.byToken(token);
    await this.ensureEditable(employee.id);
    for (const name of dto.skills) {
      const skill = await this.prisma.skill.upsert({
        where: { tenantId_name: { tenantId: offer.tenantId, name } },
        create: { tenantId: offer.tenantId, name },
        update: {},
      });
      await this.prisma.employeeSkill.upsert({
        where: { employeeId_skillId: { employeeId: employee.id, skillId: skill.id } },
        create: { employeeId: employee.id, skillId: skill.id },
        update: {},
      });
    }
    return { added: dto.skills.length };
  }

  async acknowledgePolicy(token: string, policyId: string) {
    const { offer, employee } = await this.byToken(token);
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId: offer.tenantId, isActive: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.policyAcknowledgement.upsert({
      where: {
        policyId_employeeId_version: {
          policyId,
          employeeId: employee.id,
          version: policy.version,
        },
      },
      create: {
        tenantId: offer.tenantId,
        policyId,
        employeeId: employee.id,
        version: policy.version,
      },
      update: {},
    });
  }

  // Final submission: mandatory docs + mandatory policy acks must be complete;
  // the joiner sets their portal password here.
  async complete(token: string, dto: CompleteOnboardingDto) {
    const { offer, user, employee } = await this.byToken(token);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: offer.tenantId },
    });

    const [requirements, documents, policies, acks] = await Promise.all([
      this.prisma.documentRequirement.findMany({
        where: { tenantId: tenant.id, country: tenant.country, mandatory: true },
      }),
      this.prisma.employeeDocument.findMany({ where: { employeeId: employee.id } }),
      this.prisma.policy.findMany({
        where: { tenantId: tenant.id, isActive: true, mandatory: true },
      }),
      this.prisma.policyAcknowledgement.findMany({
        where: { employeeId: employee.id },
      }),
    ]);

    const missingDocs = requirements
      .filter((r) => !documents.some((d) => d.code === r.code))
      .map((r) => r.code);
    if (missingDocs.length) {
      throw new BadRequestException(
        `Mandatory documents missing: ${missingDocs.join(', ')}`,
      );
    }
    const missingAcks = policies
      .filter((p) => !acks.some((a) => a.policyId === p.id && a.version === p.version))
      .map((p) => p.title);
    if (missingAcks.length) {
      throw new BadRequestException(
        `Policies not acknowledged: ${missingAcks.join(', ')}`,
      );
    }

    const onboardingCase = await this.prisma.onboardingCase.findUniqueOrThrow({
      where: { employeeId: employee.id },
    });
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(dto.password, 10) },
      }),
      this.prisma.onboardingCase.update({
        where: { employeeId: employee.id },
        data: { status: OnboardingStatus.DOCS_SUBMITTED },
      }),
    ]);
    // Configurable onboarding sign-off chain (no-op if none configured).
    await this.approvals.startRequest(
      offer.tenantId,
      ApprovalEntity.ONBOARDING,
      onboardingCase.id,
    );
    return { status: OnboardingStatus.DOCS_SUBMITTED };
  }

  private async ensureEditable(employeeId: string) {
    const c = await this.prisma.onboardingCase.findUnique({
      where: { employeeId },
    });
    if (c && [OnboardingStatus.COMPLETED].includes(c.status as any)) {
      throw new BadRequestException('Onboarding is already completed');
    }
  }

  // ── HR side ────────────────────────────────────────────────────────────

  setRequirement(tenantId: string, dto: DocumentRequirementDto) {
    const code = dto.code.toUpperCase();
    return this.prisma.documentRequirement.upsert({
      where: {
        tenantId_country_code: { tenantId, country: dto.country, code },
      },
      create: {
        tenantId,
        country: dto.country,
        code,
        name: dto.name,
        mandatory: dto.mandatory ?? true,
      },
      update: { name: dto.name, mandatory: dto.mandatory ?? true },
    });
  }

  listRequirements(tenantId: string, country?: string) {
    return this.prisma.documentRequirement.findMany({
      where: { tenantId, ...(country ? { country } : {}) },
    });
  }

  async listCases(
    tenantId: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortDir?: string,
    filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where: Prisma.OnboardingCaseWhereInput = { tenantId };
    if (filters.code) where.employee = { employeeCode: contains(filters.code) };
    if (filters.name) {
      where.employee = {
        OR: [
          { user: { firstName: contains(filters.name) } },
          { user: { lastName: contains(filters.name) } },
        ],
      };
    }
    if (filters.email) where.employee = { user: { email: contains(filters.email) } };
    if (filters.status) where.status = filters.status.toUpperCase() as OnboardingStatus;
    if (filters.__search) {
      const q = filters.__search;
      where.OR = [
        { employee: { employeeCode: contains(q) } },
        { employee: { user: { firstName: contains(q) } } },
        { employee: { user: { lastName: contains(q) } } },
        { employee: { user: { email: contains(q) } } },
      ];
    }
    const include = {
      employee: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          documents: true,
        },
      },
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.OnboardingCaseOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'code': return { employee: { employeeCode: dir } };
        case 'name': return { employee: { user: { lastName: dir } } };
        case 'email': return { employee: { user: { email: dir } } };
        case 'status': return { status: dir };
        default: return { createdAt: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    if (!paginated) {
      return this.prisma.onboardingCase.findMany({ where, include, orderBy });
    }
    const p = Math.max(1, page ?? 1);
    const ps = Math.min(200, Math.max(1, pageSize ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.onboardingCase.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.onboardingCase.count({ where }),
    ]);
    return {
      data,
      meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) || 1 },
    };
  }

  async verifyDocument(
    tenantId: string,
    documentId: string,
    dto: VerifyDocumentDto,
    verifierUserId: string,
  ) {
    const doc = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: dto.approve
        ? {
            status: VerificationStatus.VERIFIED,
            verifiedBy: verifierUserId,
            verifiedAt: new Date(),
            rejectionReason: null,
          }
        : {
            status: VerificationStatus.REJECTED,
            rejectionReason: dto.rejectionReason ?? 'Rejected',
          },
    });
  }

  // Onboarding sign-off (post BGC + verification): employee becomes ACTIVE.
  async approveCase(tenantId: string, caseId: string) {
    const c = await this.prisma.onboardingCase.findFirst({
      where: { id: caseId, tenantId },
    });
    if (!c) throw new NotFoundException('Onboarding case not found');
    const unverified = await this.prisma.employeeDocument.count({
      where: {
        employeeId: c.employeeId,
        status: { in: [VerificationStatus.SUBMITTED, VerificationStatus.REJECTED] },
      },
    });
    if (unverified > 0) {
      throw new BadRequestException(
        `${unverified} document(s) still pending verification`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.onboardingCase.update({
        where: { id: caseId },
        data: { status: OnboardingStatus.COMPLETED },
      }),
      this.prisma.employee.update({
        where: { id: c.employeeId },
        data: { status: EmployeeStatus.ACTIVE },
      }),
    ]);
    return { status: OnboardingStatus.COMPLETED };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, OfferStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from './ats.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, applicationId: string, dto: CreateOfferDto) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: { offer: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.offer) throw new BadRequestException('Offer already exists');
    if (app.status !== ApplicationStatus.SELECTED) {
      throw new BadRequestException(
        'Candidate must be in SELECTED status before an offer is created',
      );
    }

    const [offer] = await this.prisma.$transaction([
      this.prisma.offer.create({
        data: {
          tenantId,
          applicationId,
          designation: dto.designation,
          annualCtc: dto.annualCtc,
          salaryBreakup: dto.salaryBreakup as any,
          joiningDate: new Date(dto.joiningDate),
          location: dto.location,
        },
      }),
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.OFFERED },
      }),
    ]);
    return offer;
  }

  async send(tenantId: string, offerId: string) {
    const offer = await this.getOwned(tenantId, offerId);
    // TODO: generate offer letter PDF + email delivery (Phase 1)
    return this.prisma.offer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.SENT, sentAt: new Date() },
    });
  }

  // Candidate accepts via public token URL. Acceptance issues the secure
  // onboarding URL token used to complete documents/demographics.
  async respond(offerId: string, accept: boolean) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { application: true },
    });
    if (!offer || offer.status !== OfferStatus.SENT) {
      throw new NotFoundException('Offer not available for response');
    }

    if (!accept) {
      await this.prisma.$transaction([
        this.prisma.offer.update({
          where: { id: offerId },
          data: { status: OfferStatus.DECLINED, respondedAt: new Date() },
        }),
        this.prisma.application.update({
          where: { id: offer.applicationId },
          data: { status: ApplicationStatus.OFFER_DECLINED },
        }),
      ]);
      return { status: 'DECLINED' };
    }

    const onboardingToken = randomBytes(32).toString('hex');
    await this.prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          respondedAt: new Date(),
          onboardingToken,
        },
      });
      await tx.application.update({
        where: { id: offer.applicationId },
        data: { status: ApplicationStatus.ONBOARDING },
      });

      // Acceptance starts the employee lifecycle: login + employee record +
      // onboarding case, skills carried over from application-time tagging,
      // and the offered salary structure preserved for offered-vs-current.
      const { tenantId } = offer;
      const candidate = await tx.candidate.findUniqueOrThrow({
        where: { id: offer.application.candidateId },
        include: { skills: true },
      });
      const email = candidate.email.toLowerCase();
      const user = await tx.users.upsert({
        where: { tenantId_email: { tenantId, email } },
        create: {
          tenantId,
          email,
          passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phone: candidate.phone,
          roles: [Role.EMPLOYEE],
        },
        update: {},
      });

      const count = await tx.employee.count({ where: { tenantId } });
      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          employeeCode: `EMP-${String(count + 1).padStart(4, '0')}`,
          designation: offer.designation,
          joinDate: offer.joiningDate,
          location: offer.location,
        },
      });

      if (candidate.skills.length) {
        await tx.employeeSkill.createMany({
          data: candidate.skills.map((s) => ({
            employeeId: employee.id,
            skillId: s.skillId,
            yearsOfExp: s.yearsOfExp,
            fromApplication: true,
          })),
        });
      }

      await tx.salaryStructure.create({
        data: {
          tenantId,
          employeeId: employee.id,
          annualCtc: offer.annualCtc,
          components: offer.salaryBreakup as any,
          isOffered: true,
          effectiveFrom: offer.joiningDate,
        },
      });

      await tx.onboardingCase.create({
        data: { tenantId, employeeId: employee.id },
      });
    });
    // The onboarding URL (carrying this token) is emailed to the candidate.
    return { status: 'ACCEPTED', onboardingToken };
  }

  private async getOwned(tenantId: string, offerId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, tenantId },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, OfferStatus } from '@prisma/client';
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
    await this.prisma.$transaction([
      this.prisma.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          respondedAt: new Date(),
          onboardingToken,
        },
      }),
      this.prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: ApplicationStatus.OFFER_ACCEPTED },
      }),
    ]);
    // TODO Phase 2: create Employee + OnboardingCase and email the secure URL.
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

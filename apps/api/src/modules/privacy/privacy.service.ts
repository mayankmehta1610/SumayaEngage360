import { Injectable } from '@nestjs/common';
import { DsrStatus, DsrType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  recordConsent(tenantId: string, userId: string, purpose: string, granted: boolean, version = '1') {
    return this.prisma.consentRecord.create({
      data: { tenantId, userId, purpose, granted, version },
    });
  }

  myConsents(tenantId: string, userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  submitDsr(tenantId: string, userId: string, type: DsrType, details?: string) {
    return this.prisma.dataSubjectRequest.create({
      data: { tenantId, userId, type, details },
    });
  }

  myDsrs(tenantId: string, userId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listDsrs(tenantId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  actOnDsr(tenantId: string, id: string, status: DsrStatus) {
    return this.prisma.dataSubjectRequest.updateMany({
      where: { id, tenantId },
      data: { status, completedAt: status === 'COMPLETED' ? new Date() : undefined },
    });
  }
}

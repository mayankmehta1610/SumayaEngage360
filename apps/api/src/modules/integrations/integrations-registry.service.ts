import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationAdaptersService } from './integration-adapters.service';
import { MailService } from './mail.service';

@Injectable()
export class IntegrationsRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly adapters: IntegrationAdaptersService,
  ) {}

  listDefinitions() {
    return this.prisma.integrationDefinition.findMany({ orderBy: { id: 'asc' } });
  }

  listTenantConnections(tenantId: string) {
    return this.prisma.tenantIntegration.findMany({
      where: { tenantId },
      include: { integration: true },
    });
  }

  async upsertConnection(
    tenantId: string,
    integrationId: string,
    enabled: boolean,
    config?: Record<string, unknown>,
  ) {
    const def = await this.prisma.integrationDefinition.findUnique({ where: { id: integrationId } });
    if (!def) throw new BadRequestException('Unknown integration');
    return this.prisma.tenantIntegration.upsert({
      where: { tenantId_integrationId: { tenantId, integrationId } },
      create: {
        tenantId,
        integrationId,
        enabled,
        config: config as Prisma.InputJsonValue | undefined,
      },
      update: { enabled, config: config as Prisma.InputJsonValue | undefined },
      include: { integration: true },
    });
  }

  async testConnection(tenantId: string, integrationId: string) {
    const conn = await this.prisma.tenantIntegration.findUnique({
      where: { tenantId_integrationId: { tenantId, integrationId } },
      include: { integration: true },
    });
    if (!conn) throw new BadRequestException('Integration not configured');

    const cfg = (conn.config ?? {}) as Record<string, unknown>;
    const result = await this.adapters.test(integrationId, cfg);
    const ok = result.ok && conn.enabled;
    const message = result.message;

    await this.prisma.tenantIntegration.update({
      where: { id: conn.id },
      data: { lastTestedAt: new Date(), lastTestOk: ok },
    });
    return { ok, message, integration: conn.integration.name };
  }

  invoke(tenantId: string, integrationId: string, action: string, payload: Record<string, unknown>) {
    return this.adapters.invoke(integrationId, action, payload);
  }
}

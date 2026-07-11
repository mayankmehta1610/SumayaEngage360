import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from './approvals.service';

/** Scheduled SLA breach detection — logs breaches for ops monitoring. */
@Injectable()
export class ApprovalsSlaCronService {
  private readonly log = new Logger(ApprovalsSlaCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Cron(process.env.APPROVAL_SLA_CRON ?? '0 * * * *')
  async checkSlaBreaches() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, subdomain: true },
    });
    let total = 0;
    for (const t of tenants) {
      const breaches = await this.approvals.listSlaBreaches(t.id);
      if (breaches.length) {
        total += breaches.length;
        this.log.warn(
          `SLA breach: tenant ${t.subdomain} has ${breaches.length} overdue approval(s)`,
        );
      }
    }
    if (total) this.log.warn(`SLA check complete — ${total} total breach(es) across tenants`);
  }
}

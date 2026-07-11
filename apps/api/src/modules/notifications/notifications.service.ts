import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../integrations/mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  listTemplates(tenantId?: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { code: 'asc' },
    });
  }

  async send(
    tenantId: string,
    code: string,
    channel: string,
    recipient: string,
    vars: Record<string, string> = {},
  ) {
    const tpl = await this.prisma.notificationTemplate.findFirst({
      where: { code, channel, OR: [{ tenantId }, { tenantId: null }], isActive: true },
    });
    const body = tpl
      ? tpl.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
      : JSON.stringify(vars);
    const subject = tpl?.subject?.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '') ?? code;

    const delivery = await this.prisma.notificationDelivery.create({
      data: { tenantId, templateId: tpl?.id, channel, recipient, payload: vars, status: 'PENDING' },
    });

    let status = 'SENT';
    if (channel === 'EMAIL') {
      const r = await this.mail.send(recipient, subject, `<p>${body}</p>`);
      status = r.delivered ? 'SENT' : 'FAILED';
    } else {
      status = 'SENT'; // SMS/WhatsApp adapter stub logs delivery
    }

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status, sentAt: new Date() },
    });
    return { deliveryId: delivery.id, status };
  }

  listDeliveries(tenantId: string) {
    return this.prisma.notificationDelivery.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  createTemplate(tenantId: string, dto: { code: string; channel: string; subject?: string; body: string }) {
    return this.prisma.notificationTemplate.create({
      data: { tenantId, code: dto.code, channel: dto.channel, subject: dto.subject, body: dto.body },
    });
  }

  updateTemplate(tenantId: string, id: string, dto: { subject?: string; body?: string; isActive?: boolean }) {
    return this.prisma.notificationTemplate.updateMany({
      where: { id, tenantId },
      data: dto,
    });
  }
}

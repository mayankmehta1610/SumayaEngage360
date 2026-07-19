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

  /**
   * Fan-out an in-app notification to everyone who can see a newly published
   * intranet item (scoped by its access level). Used by both the manual
   * publish action and the approval-workflow auto-publish.
   */
  async notifyIntranetPublished(
    tenantId: string,
    content: {
      id: string;
      title: string;
      departmentId: string;
      accessLevel: string;
      allowedRoles?: unknown;
    },
  ) {
    if (content.accessLevel === 'PRIVATE') return { notified: 0 };

    let userIds: string[] = [];
    if (content.accessLevel === 'DEPARTMENT') {
      const emps = await this.prisma.employee.findMany({
        where: { tenantId, departmentId: content.departmentId },
        select: { userId: true },
      });
      userIds = emps.map((e) => e.userId);
    } else if (content.accessLevel === 'ROLES') {
      const allowed = Array.isArray(content.allowedRoles)
        ? (content.allowedRoles as string[])
        : [];
      const users = await this.prisma.users.findMany({
        where: { tenantId, isActive: true, roles: { hasSome: allowed as any } },
        select: { id: true },
        take: 500,
      });
      userIds = users.map((u) => u.id);
    } else {
      const users = await this.prisma.users.findMany({
        where: { tenantId, isActive: true },
        select: { id: true },
        take: 500,
      });
      userIds = users.map((u) => u.id);
    }
    if (!userIds.length) return { notified: 0 };

    const tpl = await this.prisma.notificationTemplate.findFirst({
      where: {
        code: 'INTRANET_PUBLISHED',
        channel: 'IN_APP',
        OR: [{ tenantId }, { tenantId: null }],
        isActive: true,
      },
    });
    await this.prisma.notificationDelivery.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        templateId: tpl?.id,
        channel: 'IN_APP',
        recipient: userId,
        payload: { contentId: content.id, title: content.title, kind: 'INTRANET_PUBLISHED' },
        status: 'SENT',
        sentAt: new Date(),
      })),
    });
    return { notified: userIds.length };
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GiveFeedbackDto, GiveRecognitionDto } from './engagement.dto';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  // Instant recognition — manager or peer initiated.
  async recognize(tenantId: string, userId: string, dto: GiveRecognitionDto) {
    const giver = await this.employeeForUser(userId);
    return this.prisma.recognition.create({
      data: {
        tenantId,
        receiverId: dto.receiverId,
        giverId: giver.id,
        badge: dto.badge,
        message: dto.message,
        points: dto.points ?? 0,
        isPublic: dto.isPublic ?? true,
      },
    });
  }

  feed(tenantId: string) {
    return this.prisma.recognition.findMany({
      where: { tenantId, isPublic: true },
      include: {
        receiver: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async myRecognitions(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.recognition.findMany({
      where: { tenantId, receiverId: emp.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async giveFeedback(tenantId: string, userId: string, dto: GiveFeedbackDto) {
    const giver = await this.employeeForUser(userId);
    return this.prisma.feedback.create({
      data: {
        tenantId,
        receiverId: dto.receiverId,
        giverId: dto.anonymous ? null : giver.id,
        type: dto.type,
        anonymous: dto.anonymous ?? false,
        content: dto.content as any,
        cycleId: dto.cycleId,
      },
    });
  }

  // Received feedback — giver identity stripped when anonymous.
  async myFeedback(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const items = await this.prisma.feedback.findMany({
      where: { tenantId, receiverId: emp.id },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((f) => ({
      ...f,
      giverId: f.anonymous ? null : f.giverId,
    }));
  }
}

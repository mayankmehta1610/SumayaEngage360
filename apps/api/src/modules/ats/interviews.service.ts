import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, InterviewResult, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordInterviewResultDto, ScheduleInterviewDto } from './ats.dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(
    tenantId: string,
    applicationId: string,
    dto: ScheduleInterviewDto,
  ) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (dto.interviewerId) {
      const interviewer = await this.prisma.users.findFirst({
        where: {
          id: dto.interviewerId,
          tenantId,
          isActive: true,
          roles: { has: Role.INTERVIEWER },
        },
        select: { id: true },
      });
      if (!interviewer) {
        throw new BadRequestException('Interviewer is not active in this tenant');
      }
    }

    const round = await this.prisma.interviewRound.create({
      data: {
        tenantId,
        applicationId,
        level: dto.level,
        name: dto.name,
        interviewerId: dto.interviewerId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        mode: dto.mode,
        meetingLink: dto.meetingLink,
      },
    });

    if (app.status === ApplicationStatus.APPLIED) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.INTERVIEW },
      });
    }
    return round;
  }

  // Records the outcome of a round. A screenshot is mandatory proof that the
  // interview happened before a PASS/FAIL result can be recorded.
  async recordResult(
    tenantId: string,
    roundId: string,
    dto: RecordInterviewResultDto,
    interviewerId?: string,
  ) {
    const round = await this.prisma.interviewRound.findFirst({
      where: { id: roundId, tenantId, ...(interviewerId ? { interviewerId } : {}) },
    });
    if (!round) throw new NotFoundException('Interview round not found');

    const decided =
      dto.result === InterviewResult.PASSED ||
      dto.result === InterviewResult.FAILED;
    const screenshot = dto.screenshotFileId ?? round.screenshotFileId;
    if (decided && !screenshot) {
      throw new BadRequestException(
        'A screenshot of the interview is mandatory before recording a result',
      );
    }

    return this.prisma.interviewRound.update({
      where: { id: roundId },
      data: {
        feedback: dto.feedback,
        rating: dto.rating,
        result: dto.result,
        recordingFileId: dto.recordingFileId,
        recordingUrl: dto.recordingUrl,
        screenshotFileId: dto.screenshotFileId,
        conductedAt: decided ? new Date() : undefined,
      },
    });
  }

  listForApplication(tenantId: string, applicationId: string, interviewerId?: string) {
    return this.prisma.interviewRound.findMany({
      where: { tenantId, applicationId, ...(interviewerId ? { interviewerId } : {}) },
      orderBy: { level: 'asc' },
    });
  }
}

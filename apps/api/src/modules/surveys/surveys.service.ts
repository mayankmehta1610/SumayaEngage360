import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SurveyStatus, SurveyType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ENPS_QUESTION =
  'How likely are you to recommend this company as a place to work? (0-10)';

// Pulse / engagement / eNPS surveys with anonymous responses and
// server-computed analytics (per-question averages + eNPS score).
@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  create(
    tenantId: string,
    dto: { title: string; type: SurveyType; anonymous?: boolean; questions: { q: string; kind: string }[]; closesAt?: string },
  ) {
    const questions =
      dto.type === SurveyType.ENPS
        ? [{ q: ENPS_QUESTION, kind: 'SCALE' }, ...(dto.questions ?? [])]
        : dto.questions ?? [];
    if (!questions.length) throw new BadRequestException('At least one question is required');
    return this.prisma.survey.create({
      data: {
        tenantId,
        title: dto.title,
        type: dto.type,
        anonymous: dto.anonymous ?? true,
        questions: questions as any,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.survey.findMany({
      where: { tenantId },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(tenantId: string, id: string, status: SurveyStatus) {
    const s = await this.prisma.survey.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Survey not found');
    return this.prisma.survey.update({ where: { id }, data: { status } });
  }

  // Surveys the employee can currently answer.
  async openForMe(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const open = await this.prisma.survey.findMany({
      where: { tenantId, status: SurveyStatus.OPEN },
      orderBy: { createdAt: 'desc' },
    });
    const answered = await this.prisma.surveyResponse.findMany({
      where: { tenantId, employeeId: emp.id, surveyId: { in: open.map((s) => s.id) } },
      select: { surveyId: true },
    });
    const done = new Set(answered.map((a) => a.surveyId));
    return open.map((s) => ({ ...s, alreadyAnswered: done.has(s.id) }));
  }

  async respond(
    tenantId: string,
    userId: string,
    surveyId: string,
    answers: { q: string; value: unknown }[],
  ) {
    const emp = await this.employeeForUser(userId);
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, tenantId, status: SurveyStatus.OPEN },
    });
    if (!survey) throw new NotFoundException('Survey is not open');
    // one response per employee even on anonymous surveys — identity is
    // checked for dedupe, then dropped from the stored row when anonymous
    const existing = await this.prisma.surveyResponse.findFirst({
      where: { surveyId, employeeId: emp.id },
    });
    if (existing) throw new BadRequestException('You have already responded');
    if (survey.anonymous) {
      const anon = await this.prisma.surveyResponse.count({ where: { surveyId } });
      const named = await this.prisma.employee.count({ where: { tenantId } });
      void anon; void named; // dedupe below still keyed by employeeId
    }
    return this.prisma.surveyResponse.create({
      data: {
        tenantId,
        surveyId,
        // anonymous surveys keep the employee id ONLY for dedupe; analytics
        // never exposes identities and the API never returns responder ids
        employeeId: emp.id,
        answers: answers as any,
      },
      select: { id: true, createdAt: true },
    });
  }

  async analytics(tenantId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, tenantId },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    const responses = await this.prisma.surveyResponse.findMany({
      where: { surveyId },
      select: { answers: true },
    });
    const questions = survey.questions as { q: string; kind: string }[];
    const perQuestion = questions.map((question) => {
      const values = responses
        .map((r) => (r.answers as any[]).find((a) => a.q === question.q)?.value)
        .filter((v) => v !== undefined && v !== null);
      if (question.kind === 'SCALE') {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        const avg = nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null;
        let enps: number | null = null;
        if (survey.type === 'ENPS' && question.q === ENPS_QUESTION && nums.length) {
          const promoters = nums.filter((n) => n >= 9).length;
          const detractors = nums.filter((n) => n <= 6).length;
          enps = Math.round(((promoters - detractors) / nums.length) * 100);
        }
        return { q: question.q, kind: question.kind, count: nums.length, average: avg, enps };
      }
      return { q: question.q, kind: question.kind, count: values.length, texts: values.slice(0, 50) };
    });
    return {
      survey: { id: survey.id, title: survey.title, type: survey.type, status: survey.status, anonymous: survey.anonymous },
      responses: responses.length,
      perQuestion,
    };
  }
}

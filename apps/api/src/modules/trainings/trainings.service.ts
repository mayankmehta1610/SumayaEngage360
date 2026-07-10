import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrainingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignCourseDto,
  CreateCourseDto,
  CreateQuizDto,
  ProgressHeartbeatDto,
  QuizAttemptDto,
} from './trainings.dto';

// Watch-progress heartbeats are only trusted up to wall-clock elapsed time,
// so a client that jumps ahead (or a tampered player) cannot mark a mandatory
// video complete without actually spending the watch time.
const HEARTBEAT_TOLERANCE_SECONDS = 20;
const COMPLETION_MARGIN_SECONDS = 5;

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  createCourse(tenantId: string, dto: CreateCourseDto) {
    const { videos = [], ...course } = dto;
    return this.prisma.trainingCourse.create({
      data: {
        tenantId,
        ...course,
        videos: {
          create: videos.map((v, i) => ({ ...v, sortOrder: v.sortOrder ?? i })),
        },
      },
      include: { videos: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  listCourses(tenantId: string) {
    return this.prisma.trainingCourse.findMany({
      where: { tenantId },
      include: {
        videos: { orderBy: { sortOrder: 'asc' } },
        quizzes: { select: { id: true, title: true, passingScore: true } },
        _count: { select: { assignments: true } },
      },
    });
  }

  async addQuiz(tenantId: string, courseId: string, dto: CreateQuizDto) {
    await this.getCourse(tenantId, courseId);
    return this.prisma.quiz.create({
      data: {
        courseId,
        title: dto.title,
        passingScore: dto.passingScore ?? 70,
        questions: dto.questions as any,
      },
    });
  }

  async assign(tenantId: string, courseId: string, dto: AssignCourseDto) {
    await this.getCourse(tenantId, courseId);
    let assigned = 0;
    for (const employeeId of dto.employeeIds) {
      await this.prisma.trainingAssignment.upsert({
        where: { courseId_employeeId: { courseId, employeeId } },
        create: {
          tenantId,
          courseId,
          employeeId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        update: {},
      });
      assigned++;
    }
    return { assigned };
  }

  async myTrainings(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { tenantId, employeeId: emp.id },
      include: {
        course: {
          include: {
            videos: { orderBy: { sortOrder: 'asc' } },
            quizzes: { select: { id: true, title: true, passingScore: true, questions: true } },
          },
        },
      },
    });
    const progress = await this.prisma.videoProgress.findMany({
      where: { tenantId, employeeId: emp.id },
    });
    // strip answers before sending quizzes to the employee
    return assignments.map((a) => ({
      ...a,
      course: {
        ...a.course,
        quizzes: a.course.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          passingScore: q.passingScore,
          questions: (q.questions as any[]).map((qq) => ({
            q: qq.q,
            options: qq.options,
          })),
        })),
        videos: a.course.videos.map((v) => ({
          ...v,
          progress: progress.find((p) => p.videoId === v.id) ?? null,
        })),
      },
    }));
  }

  // The no-skip enforcement. The player posts its position periodically; the
  // server only credits watch time consistent with real elapsed time.
  async heartbeat(
    tenantId: string,
    userId: string,
    videoId: string,
    dto: ProgressHeartbeatDto,
  ) {
    const emp = await this.employeeForUser(userId);
    const video = await this.prisma.trainingVideo.findUnique({
      where: { id: videoId },
      include: { course: true },
    });
    if (!video || video.course.tenantId !== tenantId) {
      throw new NotFoundException('Video not found');
    }

    const existing = await this.prisma.videoProgress.findUnique({
      where: { videoId_employeeId: { videoId, employeeId: emp.id } },
    });
    if (existing?.completed) return existing;

    const now = new Date();
    let watched: number;
    if (!existing) {
      // first heartbeat: credit at most the tolerance window
      watched = Math.min(dto.positionSeconds, HEARTBEAT_TOLERANCE_SECONDS);
    } else if (video.noSkip) {
      const elapsed = Math.max(
        0,
        (now.getTime() - existing.updatedAt.getTime()) / 1000,
      );
      const maxCredit =
        existing.watchedSeconds + elapsed + HEARTBEAT_TOLERANCE_SECONDS;
      watched = Math.max(
        existing.watchedSeconds,
        Math.min(dto.positionSeconds, maxCredit, video.durationSeconds),
      );
    } else {
      watched = Math.max(
        existing.watchedSeconds,
        Math.min(dto.positionSeconds, video.durationSeconds),
      );
    }

    const completed =
      watched >= video.durationSeconds - COMPLETION_MARGIN_SECONDS;
    const progress = await this.prisma.videoProgress.upsert({
      where: { videoId_employeeId: { videoId, employeeId: emp.id } },
      create: {
        tenantId,
        videoId,
        employeeId: emp.id,
        watchedSeconds: Math.floor(watched),
        completed,
        completedAt: completed ? now : null,
      },
      update: {
        watchedSeconds: Math.floor(watched),
        completed,
        completedAt: completed ? now : undefined,
      },
    });

    if (completed) await this.refreshCompletion(tenantId, video.courseId, emp.id);
    return progress;
  }

  async attemptQuiz(
    tenantId: string,
    userId: string,
    quizId: string,
    dto: QuizAttemptDto,
  ) {
    const emp = await this.employeeForUser(userId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true },
    });
    if (!quiz || quiz.course.tenantId !== tenantId) {
      throw new NotFoundException('Quiz not found');
    }
    const questions = quiz.questions as { answerIndex: number }[];
    if (dto.answers.length !== questions.length) {
      throw new BadRequestException(
        `Expected ${questions.length} answers, got ${dto.answers.length}`,
      );
    }
    const correct = questions.filter(
      (q, i) => q.answerIndex === dto.answers[i],
    ).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        tenantId,
        quizId,
        employeeId: emp.id,
        answers: dto.answers as any,
        score,
        passed,
      },
    });
    if (passed) await this.refreshCompletion(tenantId, quiz.courseId, emp.id);
    return attempt;
  }

  // Course completes when every video is watched and every quiz is passed.
  private async refreshCompletion(
    tenantId: string,
    courseId: string,
    employeeId: string,
  ) {
    const course = await this.prisma.trainingCourse.findUnique({
      where: { id: courseId },
      include: { videos: true, quizzes: true },
    });
    if (!course) return;

    const [videoDone, quizzesPassed] = await Promise.all([
      this.prisma.videoProgress.count({
        where: {
          employeeId,
          completed: true,
          videoId: { in: course.videos.map((v) => v.id) },
        },
      }),
      Promise.all(
        course.quizzes.map((q) =>
          this.prisma.quizAttempt.count({
            where: { quizId: q.id, employeeId, passed: true },
          }),
        ),
      ),
    ]);

    const allVideos = videoDone >= course.videos.length;
    const allQuizzes = quizzesPassed.every((c) => c > 0);
    await this.prisma.trainingAssignment.updateMany({
      where: { tenantId, courseId, employeeId },
      data:
        allVideos && allQuizzes
          ? { status: TrainingStatus.COMPLETED, completedAt: new Date() }
          : { status: TrainingStatus.IN_PROGRESS },
    });
  }

  private async getCourse(tenantId: string, id: string) {
    const c = await this.prisma.trainingCourse.findFirst({
      where: { id, tenantId },
    });
    if (!c) throw new NotFoundException('Course not found');
    return c;
  }

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }
}

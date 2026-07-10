import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import {
  AssignCourseDto,
  CreateCourseDto,
  CreateQuizDto,
  ProgressHeartbeatDto,
  QuizAttemptDto,
} from './trainings.dto';
import { TrainingsService } from './trainings.service';

@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainings: TrainingsService) {}

  @Post('courses')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createCourse(@TenantId() tenantId: string, @Body() dto: CreateCourseDto) {
    return this.trainings.createCourse(tenantId, dto);
  }

  @Get('courses')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  listCourses(@TenantId() tenantId: string) {
    return this.trainings.listCourses(tenantId);
  }

  @Post('courses/:id/quizzes')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addQuiz(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.trainings.addQuiz(tenantId, id, dto);
  }

  @Post('courses/:id/assign')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignCourseDto,
  ) {
    return this.trainings.assign(tenantId, id, dto);
  }

  @Get('mine')
  mine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.trainings.myTrainings(tenantId, user.sub);
  }

  // Locked-player heartbeat — server-side no-skip enforcement.
  @Post('videos/:videoId/progress')
  heartbeat(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('videoId') videoId: string,
    @Body() dto: ProgressHeartbeatDto,
  ) {
    return this.trainings.heartbeat(tenantId, user.sub, videoId, dto);
  }

  @Post('quizzes/:quizId/attempt')
  attempt(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('quizId') quizId: string,
    @Body() dto: QuizAttemptDto,
  ) {
    return this.trainings.attemptQuiz(tenantId, user.sub, quizId, dto);
  }
}

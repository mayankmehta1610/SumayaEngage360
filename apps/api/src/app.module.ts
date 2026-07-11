import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AtsModule } from './modules/ats/ats.module';
import { CareersModule } from './modules/careers/careers.module';
import { FilesModule } from './modules/files/files.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { AppraisalsModule } from './modules/appraisals/appraisals.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { AssetsModule } from './modules/assets/assets.module';
import { TrainingsModule } from './modules/trainings/trainings.module';
import { ExitModule } from './modules/exit/exit.module';
import { MatchingModule } from './modules/matching/matching.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantsModule,
    AtsModule,
    CareersModule,
    FilesModule,
    IntegrationsModule,
    EmployeesModule,
    OnboardingModule,
    ApprovalsModule,
    ProjectsModule,
    TimesheetsModule,
    AppraisalsModule,
    EngagementModule,
    AssetsModule,
    TrainingsModule,
    ExitModule,
    MatchingModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

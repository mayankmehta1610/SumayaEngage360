import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditInterceptor } from './common/http/audit.interceptor';
import { CorrelationIdMiddleware } from './common/http/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { IdempotencyMiddleware } from './common/http/idempotency.middleware';
import { RateLimitMiddleware } from './common/http/rate-limit.middleware';
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
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PlatformModule } from './modules/platform/platform.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { ConfigModule as TenantConfigModule } from './modules/config/config.module';
import { OrgMastersModule } from './modules/org-masters/org-masters.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExportsModule } from './modules/exports/exports.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ManpowerModule } from './modules/manpower/manpower.module';
import { PreboardingModule } from './modules/preboarding/preboarding.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { MastersModule } from './modules/masters/masters.module';
import { AgencyModule } from './modules/agency/agency.module';
import { StaffingModule } from './modules/staffing/staffing.module';

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
    DashboardModule,
    AttendanceModule,
    AuditModule,
    ReportsModule,
    PlatformModule,
    CatalogueModule,
    TenantConfigModule,
    OrgMastersModule,
    PrivacyModule,
    NotificationsModule,
    ExportsModule,
    RequirementsModule,
    PayrollModule,
    BenefitsModule,
    ExpensesModule,
    GoalsModule,
    ManpowerModule,
    PreboardingModule,
    MastersModule,
    SurveysModule,
    ComplianceModule,
    AgencyModule,
    StaffingModule,
  ],
  controllers: [HealthController],
  providers: [
    IdempotencyMiddleware,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RateLimitMiddleware, TenantMiddleware, IdempotencyMiddleware)
      .forRoutes('*');
  }
}

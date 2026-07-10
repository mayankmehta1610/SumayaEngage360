import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { BgcController } from './bgc.controller';
import { BgcService } from './bgc.service';
import { OnboardingAdminController } from './onboarding-admin.controller';
import { OnboardingPublicController } from './onboarding-public.controller';
import { OnboardingService } from './onboarding.service';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [ApprovalsModule],
  controllers: [
    OnboardingPublicController,
    OnboardingAdminController,
    BgcController,
    PoliciesController,
  ],
  providers: [OnboardingService, BgcService, PoliciesService],
})
export class OnboardingModule {}

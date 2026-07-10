import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import {
  CompleteOnboardingDto,
  OnboardingSkillsDto,
  SubmitDocumentDto,
} from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

// Secure-URL portal the new joiner receives after accepting the offer.
@Public()
@Controller('public/onboarding')
export class OnboardingPublicController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get(':token')
  portal(@Param('token') token: string) {
    return this.onboarding.getPortal(token);
  }

  @Post(':token/documents')
  submitDocument(@Param('token') token: string, @Body() dto: SubmitDocumentDto) {
    return this.onboarding.submitDocument(token, dto);
  }

  @Post(':token/skills')
  addSkills(@Param('token') token: string, @Body() dto: OnboardingSkillsDto) {
    return this.onboarding.addSkills(token, dto);
  }

  @Post(':token/policies/:policyId/acknowledge')
  acknowledge(@Param('token') token: string, @Param('policyId') policyId: string) {
    return this.onboarding.acknowledgePolicy(token, policyId);
  }

  @Post(':token/complete')
  complete(@Param('token') token: string, @Body() dto: CompleteOnboardingDto) {
    return this.onboarding.complete(token, dto);
  }
}

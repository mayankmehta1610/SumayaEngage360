import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { GiveFeedbackDto, GiveRecognitionDto } from './engagement.dto';
import { EngagementService } from './engagement.service';

@Controller()
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Post('recognitions')
  recognize(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GiveRecognitionDto,
  ) {
    return this.engagement.recognize(tenantId, user.sub, dto);
  }

  @Get('recognitions/feed')
  feed(@TenantId() tenantId: string) {
    return this.engagement.feed(tenantId);
  }

  @Get('recognitions/mine')
  mine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.engagement.myRecognitions(tenantId, user.sub);
  }

  @Post('feedback')
  give(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GiveFeedbackDto,
  ) {
    return this.engagement.giveFeedback(tenantId, user.sub, dto);
  }

  @Get('feedback/mine')
  myFeedback(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.engagement.myFeedback(tenantId, user.sub);
  }
}

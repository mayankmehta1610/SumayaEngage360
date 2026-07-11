import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { MatchingService } from './matching.service';
import { ParserCronService } from './parser-cron.service';

class MatchJobDto {
  @IsOptional()
  @IsBoolean()
  useAi?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  autoShortlist?: boolean;
}

@Controller()
@Roles(Role.TENANT_ADMIN, Role.HR)
export class MatchingController {
  constructor(
    private readonly matching: MatchingService,
    private readonly parserCron: ParserCronService,
  ) {}

  // Score the whole talent pool against a JD and auto-shortlist.
  @Post('jobs/:jobId/match')
  match(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string,
    @Body() dto: MatchJobDto,
  ) {
    return this.matching.matchJob(tenantId, jobId, dto);
  }

  @Get('jobs/:jobId/matches')
  list(@TenantId() tenantId: string, @Param('jobId') jobId: string) {
    return this.matching.listMatches(tenantId, jobId);
  }

  // Run the offline resume parser now (same job the cron runs on schedule).
  @Post('matching/parse-pending')
  parsePending() {
    return this.parserCron.parsePending();
  }
}

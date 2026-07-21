import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Public } from '../../common/auth/public.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ApplyDto } from '../ats/ats.dto';
import { ApplicationsService } from '../ats/applications.service';
import { CareersService } from './careers.service';

class ParseResumeDto {
  @IsString()
  resumeFileId: string;
}

@Public()
@Controller('public/careers')
export class CareersController {
  constructor(
    private readonly careers: CareersService,
    private readonly applications: ApplicationsService,
  ) {}

  // Auto-fill: an applicant uploads a resume, we extract structured fields
  // (in-house parser, no external API) and return them to pre-populate the form.
  @Post('parse-resume')
  parseResume(@TenantId() tenantId: string, @Body() dto: ParseResumeDto) {
    return this.careers.parseResume(tenantId, dto.resumeFileId);
  }

  // Client-specific public listing: all open roles with JD, vacancies, location.
  @Get(':clientSlug')
  clientPage(
    @TenantId() tenantId: string,
    @Param('clientSlug') clientSlug: string,
  ) {
    return this.careers.getClientPage(tenantId, clientSlug);
  }

  @Get('jobs/:jobId')
  job(@TenantId() tenantId: string, @Param('jobId') jobId: string) {
    return this.careers.getJob(tenantId, jobId);
  }

  @Get('jobs/:jobId/field-definitions')
  fieldDefinitions(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.careers.getFieldDefinitions(tenantId, jobId);
  }

  // Candidate applies: full profile + demographics + experience + skills (mandatory)
  // + resume upload reference. LLM resume parsing plugs in behind this later.
  @Post('jobs/:jobId/apply')
  apply(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyDto,
  ) {
    return this.applications.apply(tenantId, jobId, dto);
  }
}

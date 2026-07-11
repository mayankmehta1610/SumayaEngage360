import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { SftpImportService } from './sftp-import.service';

class SftpJobDto {
  @IsString() remotePath: string;
  @IsString() entityType: string;
}

@Controller('integrations/sftp')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class SftpImportController {
  constructor(private readonly sftp: SftpImportService) {}

  @Get('jobs')
  jobs(@TenantId() t: string) {
    return this.sftp.listJobs(t);
  }

  @Post('import')
  import(@TenantId() t: string, @Body() dto: SftpJobDto) {
    return this.sftp.createJob(t, dto);
  }
}

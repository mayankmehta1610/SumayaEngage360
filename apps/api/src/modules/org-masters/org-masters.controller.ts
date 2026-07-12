import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { OrgMastersService } from './org-masters.service';

class CodeNameDto {
  @IsString() code: string;
  @IsString() name: string;
}

class UpdateCodeNameDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() level?: number;
}

class GradeDto extends CodeNameDto {
  @IsOptional() @IsInt() level?: number;
}

class HolidayDto {
  @IsString() name: string;
  @IsInt() year: number;
  @IsArray() holidays: unknown[];
}

class JdDto {
  @IsString() title: string;
  @IsString() body: string;
  @IsOptional() @IsArray() tags?: string[];
}

@Controller('org-masters')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class OrgMastersController {
  constructor(private readonly org: OrgMastersService) {}

  @Get('legal-entities') listLe(@TenantId() t: string) { return this.org.legalEntities(t).list(); }
  @Post('legal-entities') createLe(@TenantId() t: string, @Body() dto: CodeNameDto) {
    return this.org.legalEntities(t).create(dto);
  }
  @Patch('legal-entities/:id') updateLe(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.legalEntities(t).update(id, dto);
  }
  @Delete('legal-entities/:id') removeLe(@TenantId() t: string, @Param('id') id: string) {
    return this.org.legalEntities(t).remove(id);
  }

  @Get('locations') listLoc(@TenantId() t: string) { return this.org.locations(t).list(); }
  @Post('locations') createLoc(@TenantId() t: string, @Body() dto: CodeNameDto) {
    return this.org.locations(t).create(dto);
  }
  @Patch('locations/:id') updateLoc(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.locations(t).update(id, dto);
  }
  @Delete('locations/:id') removeLoc(@TenantId() t: string, @Param('id') id: string) {
    return this.org.locations(t).remove(id);
  }

  @Get('business-units') listBu(@TenantId() t: string) { return this.org.businessUnits(t).list(); }
  @Post('business-units') createBu(@TenantId() t: string, @Body() dto: CodeNameDto) {
    return this.org.businessUnits(t).create(dto);
  }
  @Patch('business-units/:id') updateBu(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.businessUnits(t).update(id, dto);
  }
  @Delete('business-units/:id') removeBu(@TenantId() t: string, @Param('id') id: string) {
    return this.org.businessUnits(t).remove(id);
  }

  @Get('cost-centers') listCc(@TenantId() t: string) { return this.org.costCenters(t).list(); }
  @Post('cost-centers') createCc(@TenantId() t: string, @Body() dto: CodeNameDto) {
    return this.org.costCenters(t).create(dto);
  }
  @Patch('cost-centers/:id') updateCc(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.costCenters(t).update(id, dto);
  }
  @Delete('cost-centers/:id') removeCc(@TenantId() t: string, @Param('id') id: string) {
    return this.org.costCenters(t).remove(id);
  }

  @Get('grades') listGr(@TenantId() t: string) { return this.org.grades(t).list(); }
  @Post('grades') createGr(@TenantId() t: string, @Body() dto: GradeDto) {
    return this.org.grades(t).create(dto);
  }
  @Patch('grades/:id') updateGr(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.grades(t).update(id, dto);
  }
  @Delete('grades/:id') removeGr(@TenantId() t: string, @Param('id') id: string) {
    return this.org.grades(t).remove(id);
  }

  @Get('employment-types') async listEt(@TenantId() t: string) {
    await this.org.ensureDefaultEmploymentTypes(t);
    return this.org.employmentTypes(t).list();
  }
  @Post('employment-types') createEt(@TenantId() t: string, @Body() dto: CodeNameDto) {
    return this.org.employmentTypes(t).create(dto);
  }
  @Patch('employment-types/:id') updateEt(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdateCodeNameDto) {
    return this.org.employmentTypes(t).update(id, dto);
  }
  @Delete('employment-types/:id') removeEt(@TenantId() t: string, @Param('id') id: string) {
    return this.org.employmentTypes(t).remove(id);
  }

  @Get('holiday-calendars') listHol(@TenantId() t: string) { return this.org.listHolidays(t); }
  @Post('holiday-calendars') createHol(@TenantId() t: string, @Body() dto: HolidayDto) {
    return this.org.createHoliday(t, dto);
  }

  @Get('jd-library') listJd(@TenantId() t: string) { return this.org.listJd(t); }
  @Post('jd-library') createJd(@TenantId() t: string, @Body() dto: JdDto) {
    return this.org.createJd(t, dto);
  }
}

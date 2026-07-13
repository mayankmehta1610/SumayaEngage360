import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AddLifecycleDocumentDto, AddLifecycleTaskDto, EnsureLifecycleDto, UpdateLifecycleCaseDto, UpdateLifecycleDocumentDto, UpdateLifecycleStageDto, UpdateLifecycleTaskDto } from './lifecycles.dto';
import { LifecyclesService } from './lifecycles.service';

@Controller('lifecycle-cases')
export class LifecyclesController {
  constructor(private readonly lifecycles: LifecyclesService) {}

  @Get('templates') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.INTERVIEWER)
  templates() { return this.lifecycles.templates(); }
  @Post('ensure') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  ensure(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Body() dto: EnsureLifecycleDto) { return this.lifecycles.ensure(tenantId, dto, actor.sub, actor.email); }
  @Get() @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.INTERVIEWER)
  list(@TenantId() tenantId: string, @Query('workflowCode') workflowCode?: string, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) { return this.lifecycles.list(tenantId, workflowCode, entityType, entityId); }
  @Get(':id') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.INTERVIEWER)
  detail(@TenantId() tenantId: string, @Param('id') id: string) { return this.lifecycles.detail(tenantId, id); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Patch(':id') updateCase(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLifecycleCaseDto) { return this.lifecycles.updateCase(tenantId, id, dto, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Post(':id/recalculate') recalculate(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string) { return this.lifecycles.recalculate(tenantId, id, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Patch('stages/:id') updateStage(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLifecycleStageDto) { return this.lifecycles.updateStage(tenantId, id, dto, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Post('stages/:id/tasks') addTask(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AddLifecycleTaskDto) { return this.lifecycles.addTask(tenantId, id, dto, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Post('stages/:id/documents') addDocument(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AddLifecycleDocumentDto) { return this.lifecycles.addDocument(tenantId, id, dto, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Patch('tasks/:id') updateTask(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLifecycleTaskDto) { return this.lifecycles.updateTask(tenantId, id, dto, actor.sub, actor.email); }
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  @Patch('documents/:id') updateDocument(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLifecycleDocumentDto) { return this.lifecycles.updateDocument(tenantId, id, dto, actor.sub, actor.email); }
}

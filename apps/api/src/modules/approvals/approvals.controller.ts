import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApprovalEntity, Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ApprovalActionDto, CreateWorkflowDto } from './approvals.dto';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post('workflows')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createWorkflow(@TenantId() tenantId: string, @Body() dto: CreateWorkflowDto) {
    return this.approvals.createWorkflow(tenantId, dto);
  }

  @Get('workflows')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listWorkflows(@TenantId() tenantId: string) {
    return this.approvals.listWorkflows(tenantId);
  }

  @Post('workflows/:id/versions')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createVersion(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { definition: Record<string, unknown> },
  ) {
    return this.approvals.createVersion(tenantId, id, dto.definition);
  }

  @Get('workflows/:id/versions')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  versions(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.approvals.versions(tenantId, id);
  }

  // Approvals inbox for the logged-in user (any role can be an approver).
  @Get('pending')
  myPending(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.approvals.myPending(tenantId, user.sub);
  }

  @Get('sla-breaches')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  slaBreaches(@TenantId() tenantId: string) {
    return this.approvals.listSlaBreaches(tenantId);
  }

  @Post(':requestId/act')
  act(
    @TenantId() tenantId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.act(tenantId, requestId, user.sub, dto);
  }

  @Get('for-entity')
  forEntity(
    @TenantId() tenantId: string,
    @Query('entityType') entityType: ApprovalEntity,
    @Query('entityId') entityId: string,
  ) {
    return this.approvals.requestFor(tenantId, entityType, entityId);
  }

  @Get('delegations')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  delegations(@TenantId() tenantId: string) {
    return this.approvals.listDelegations(tenantId);
  }

  @Post('delegations')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createDelegation(
    @TenantId() tenantId: string,
    @Body() body: { delegatorId: string; delegateId: string; startsAt: string; endsAt?: string },
  ) {
    return this.approvals.createDelegation(tenantId, body);
  }

  @Get('rules')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  rules(@TenantId() tenantId: string, @Query('ruleType') ruleType?: string) {
    return this.approvals.listRules(tenantId, ruleType);
  }

  @Post('rules')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createRule(
    @TenantId() tenantId: string,
    @Body() body: { ruleType: string; name: string; definition: Record<string, unknown> },
  ) {
    return this.approvals.createRule(tenantId, body);
  }
}

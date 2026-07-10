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

  // Approvals inbox for the logged-in user (any role can be an approver).
  @Get('pending')
  myPending(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.approvals.myPending(tenantId, user.sub);
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
}

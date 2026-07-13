import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalEntity,
  OnboardingStatus,
  RequestStatus,
  ResignationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalActionDto, CreateWorkflowDto } from './approvals.dto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── workflow configuration ─────────────────────────────────────────────

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto) {
    const ordered = [...dto.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    if (ordered.some((step, index) => step.stepOrder !== index + 1)) {
      throw new BadRequestException('Workflow steps must be numbered consecutively from 1');
    }
    for (const step of ordered) {
      if (step.approverType === 'USER') {
        if (!step.approverValue) throw new BadRequestException(`Step ${step.stepOrder} requires a user`);
        const user = await this.prisma.users.findFirst({ where: { id: step.approverValue, tenantId, isActive: true }, select: { id: true } });
        if (!user) throw new BadRequestException(`Step ${step.stepOrder} approver user is invalid`);
      }
      if (step.approverType === 'DESIGNATION') {
        if (!step.approverValue) throw new BadRequestException(`Step ${step.stepOrder} requires a designation`);
        const designation = await this.prisma.designation.findFirst({ where: { tenantId, name: step.approverValue }, select: { id: true } });
        if (!designation) throw new BadRequestException(`Step ${step.stepOrder} designation is invalid`);
      }
    }
    return this.prisma.approvalWorkflow.create({
      data: {
        tenantId,
        entityType: dto.entityType,
        name: dto.name,
        steps: {
          create: ordered.map((s) => ({
            stepOrder: s.stepOrder,
            approverType: s.approverType,
            approverValue: s.approverValue,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  listWorkflows(tenantId: string) {
    return this.prisma.approvalWorkflow.findMany({
      where: { tenantId, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, versions: { orderBy: { version: 'desc' }, take: 3 } },
    });
  }

  async createVersion(tenantId: string, workflowId: string, definition: Record<string, unknown>) {
    const wf = await this.prisma.approvalWorkflow.findFirst({ where: { id: workflowId, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const latest = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;
    await this.prisma.workflowVersion.updateMany({ where: { workflowId }, data: { isActive: false } });
    return this.prisma.workflowVersion.create({
      data: { tenantId, workflowId, version, definition: definition as any, isActive: true },
    });
  }

  versions(tenantId: string, workflowId: string) {
    return this.prisma.workflowVersion.findMany({
      where: { tenantId, workflowId },
      orderBy: { version: 'desc' },
    });
  }

  // ── request lifecycle (called by other modules and via API) ───────────

  // Starts a request if the tenant configured a workflow for the entity type.
  // Returns null when no workflow exists — callers then treat it as auto-approved.
  async startRequest(
    tenantId: string,
    entityType: ApprovalEntity,
    entityId: string,
  ) {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { tenantId, entityType, isActive: true },
      include: { steps: true },
    });
    if (!workflow || workflow.steps.length === 0) return null;
    return this.prisma.approvalRequest.create({
      data: { tenantId, workflowId: workflow.id, entityType, entityId },
    });
  }

  // Everything awaiting the current user's sign-off.
  async myPending(tenantId: string, userId: string) {
    const requests = await this.prisma.approvalRequest.findMany({
      where: { tenantId, status: RequestStatus.PENDING },
      include: { workflow: { include: { steps: true } }, actions: true },
    });
    const slaHours = await this.defaultSlaHours(tenantId);
    const mine = [] as (typeof requests[0] & { slaBreached: boolean; slaDueAt: string })[];
    for (const r of requests) {
      const approvers = await this.resolveApprovers(r);
      if (approvers.includes(userId)) {
        const dueAt = new Date(r.createdAt.getTime() + slaHours * 3600_000);
        mine.push({
          ...r,
          slaBreached: Date.now() > dueAt.getTime(),
          slaDueAt: dueAt.toISOString(),
        });
      }
    }
    return mine;
  }

  async act(
    tenantId: string,
    requestId: string,
    userId: string,
    dto: ApprovalActionDto,
  ) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, tenantId, status: RequestStatus.PENDING },
      include: { workflow: { include: { steps: true } } },
    });
    if (!request) throw new NotFoundException('Pending approval not found');

    await this.evaluateBusinessRules(tenantId, request.entityType, request.entityId, dto.action);

    const approvers = await this.resolveApprovers(request);
    if (!approvers.includes(userId)) {
      throw new ForbiddenException('You are not an approver for this step');
    }

    await this.prisma.approvalAction.create({
      data: {
        requestId,
        stepOrder: request.currentStep,
        actorId: userId,
        action: dto.action,
        comment: dto.comment,
      },
    });

    if (dto.action === 'DELEGATED') {
      if (!dto.delegateUserId) {
        throw new BadRequestException('delegateUserId is required to delegate');
      }
      // Replace the current step's resolution with the named delegate.
      const step = request.workflow.steps.find(
        (s) => s.stepOrder === request.currentStep,
      );
      if (step) {
        await this.prisma.approvalStep.update({
          where: { id: step.id },
          data: { approverType: 'USER', approverValue: dto.delegateUserId },
        });
      }
      return { status: RequestStatus.PENDING, delegatedTo: dto.delegateUserId };
    }

    if (dto.action === 'REJECTED') {
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.REJECTED },
      });
      await this.applyOutcome(request.entityType, request.entityId, false);
      return { status: RequestStatus.REJECTED };
    }

    // APPROVED: advance or finish.
    const maxStep = Math.max(...request.workflow.steps.map((s) => s.stepOrder));
    if (request.currentStep >= maxStep) {
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.APPROVED },
      });
      await this.applyOutcome(request.entityType, request.entityId, true);
      return { status: RequestStatus.APPROVED };
    }
    await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { currentStep: request.currentStep + 1 },
    });
    return { status: RequestStatus.PENDING, currentStep: request.currentStep + 1 };
  }

  requestFor(tenantId: string, entityType: ApprovalEntity, entityId: string) {
    return this.prisma.approvalRequest.findFirst({
      where: { tenantId, entityType, entityId },
      include: { actions: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── approver resolution ────────────────────────────────────────────────

  private async resolveApprovers(request: {
    tenantId: string;
    entityType: ApprovalEntity;
    entityId: string;
    currentStep: number;
    workflow: { steps: { stepOrder: number; approverType: string; approverValue: string | null }[] };
  }): Promise<string[]> {
    const step = request.workflow.steps.find(
      (s) => s.stepOrder === request.currentStep,
    );
    if (!step) return [];

    let base: string[];
    switch (step.approverType) {
      case 'USER':
        base = step.approverValue ? [step.approverValue] : [];
        break;
      case 'DESIGNATION': {
        const emps = await this.prisma.employee.findMany({
          where: {
            tenantId: request.tenantId,
            designation: step.approverValue ?? '',
          },
          select: { userId: true },
        });
        base = emps.map((e) => e.userId);
        break;
      }
      case 'REPORTING_MANAGER': {
        const subject = await this.subjectEmployee(request.entityType, request.entityId);
        if (!subject?.managerId) return [];
        const mgr = await this.prisma.employee.findUnique({
          where: { id: subject.managerId },
          select: { userId: true },
        });
        base = mgr ? [mgr.userId] : [];
        break;
      }
      case 'DEPARTMENT_HEAD': {
        const subject = await this.subjectEmployee(request.entityType, request.entityId);
        if (!subject?.departmentId) return [];
        const dept = await this.prisma.department.findUnique({
          where: { id: subject.departmentId },
        });
        if (!dept?.headId) return [];
        const head = await this.prisma.employee.findUnique({
          where: { id: dept.headId },
          select: { userId: true },
        });
        base = head ? [head.userId] : [];
        break;
      }
      default:
        base = [];
    }
    return this.applyDelegations(request.tenantId, base);
  }

  /** Active delegations expand the approver set for out-of-office coverage. */
  private async applyDelegations(tenantId: string, approverIds: string[]): Promise<string[]> {
    if (!approverIds.length) return [];
    const now = new Date();
    const delegations = await this.prisma.approvalDelegation.findMany({
      where: {
        tenantId,
        isActive: true,
        delegatorId: { in: approverIds },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    });
    const delegates = delegations.map((d) => d.delegateId);
    return [...new Set([...approverIds, ...delegates])];
  }

  private async subjectEmployee(entityType: ApprovalEntity, entityId: string) {
    switch (entityType) {
      case ApprovalEntity.ONBOARDING: {
        const c = await this.prisma.onboardingCase.findUnique({
          where: { id: entityId },
          include: { employee: true },
        });
        return c?.employee ?? null;
      }
      case ApprovalEntity.RESIGNATION: {
        const r = await this.prisma.resignation.findUnique({
          where: { id: entityId },
          include: { employee: true },
        });
        return r?.employee ?? null;
      }
      case ApprovalEntity.TIMESHEET: {
        const t = await this.prisma.timesheet.findUnique({
          where: { id: entityId },
          include: { employee: true },
        });
        return t?.employee ?? null;
      }
      default:
        return null;
    }
  }

  // Side effects when a chain fully resolves.
  private async applyOutcome(
    entityType: ApprovalEntity,
    entityId: string,
    approved: boolean,
  ) {
    switch (entityType) {
      case ApprovalEntity.RESIGNATION:
        await this.prisma.resignation.update({
          where: { id: entityId },
          data: {
            status: approved
              ? ResignationStatus.ACCEPTED
              : ResignationStatus.REJECTED,
          },
        });
        break;
      case ApprovalEntity.ONBOARDING:
        if (approved) {
          await this.prisma.onboardingCase.update({
            where: { id: entityId },
            data: { status: OnboardingStatus.APPROVAL },
          });
        }
        break;
      default:
        break; // other entities read the request status directly
    }
  }

  // ── delegation, SLA, escalation, business rules ────────────────────────

  listDelegations(tenantId: string) {
    return this.prisma.approvalDelegation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { startsAt: 'desc' },
    });
  }

  createDelegation(
    tenantId: string,
    body: { delegatorId: string; delegateId: string; startsAt: string; endsAt?: string },
  ) {
    return this.prisma.approvalDelegation.create({
      data: {
        tenantId,
        delegatorId: body.delegatorId,
        delegateId: body.delegateId,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      },
    });
  }

  listRules(tenantId: string, ruleType?: string) {
    return this.prisma.workflowRule.findMany({
      where: { tenantId, isActive: true, ...(ruleType ? { ruleType } : {}) },
    });
  }

  createRule(
    tenantId: string,
    body: { ruleType: string; name: string; definition: Record<string, unknown> },
  ) {
    return this.prisma.workflowRule.create({
      data: { tenantId, ...body, definition: body.definition as object },
    });
  }

  /** SLA hours from tenant workflow rules (ruleType SLA) or default 48h. */
  async defaultSlaHours(tenantId: string): Promise<number> {
    const rule = await this.prisma.workflowRule.findFirst({
      where: { tenantId, isActive: true, ruleType: 'SLA' },
      orderBy: { name: 'asc' },
    });
    const hours = (rule?.definition as { hours?: number } | null)?.hours;
    return typeof hours === 'number' && hours > 0 ? hours : 48;
  }

  /** Pending requests past SLA — used by cron and admin dashboards. */
  async listSlaBreaches(tenantId: string) {
    const slaHours = await this.defaultSlaHours(tenantId);
    const cutoff = new Date(Date.now() - slaHours * 3600_000);
    const pending = await this.prisma.approvalRequest.findMany({
      where: { tenantId, status: RequestStatus.PENDING, createdAt: { lt: cutoff } },
      include: { workflow: true },
      orderBy: { createdAt: 'asc' },
    });
    return pending.map((r) => ({
      ...r,
      slaHours,
      slaDueAt: new Date(r.createdAt.getTime() + slaHours * 3600_000).toISOString(),
      hoursOverdue: Math.floor((Date.now() - r.createdAt.getTime() - slaHours * 3600_000) / 3600_000),
    }));
  }

  /** Evaluates tenant business rules before allowing an approval action. */
  private async evaluateBusinessRules(
    tenantId: string,
    entityType: ApprovalEntity,
    entityId: string,
    action: string,
  ) {
    const rules = await this.prisma.workflowRule.findMany({
      where: { tenantId, isActive: true, ruleType: 'APPROVAL' },
    });
    for (const rule of rules) {
      const def = rule.definition as {
        entityTypes?: string[];
        blockActions?: string[];
        requireCommentOn?: string[];
      };
      if (def.entityTypes?.length && !def.entityTypes.includes(entityType)) continue;
      if (def.blockActions?.includes(action)) {
        throw new BadRequestException(`Business rule "${rule.name}" blocks action ${action}`);
      }
      if (def.requireCommentOn?.includes(action)) {
        // comment validation happens in DTO layer for act(); hook for extensions
      }
    }
  }
}

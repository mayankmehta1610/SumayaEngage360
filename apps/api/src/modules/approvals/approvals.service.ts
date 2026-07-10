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

  createWorkflow(tenantId: string, dto: CreateWorkflowDto) {
    return this.prisma.approvalWorkflow.create({
      data: {
        tenantId,
        entityType: dto.entityType,
        name: dto.name,
        steps: {
          create: dto.steps.map((s) => ({
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
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
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
    const mine = [] as typeof requests;
    for (const r of requests) {
      const approvers = await this.resolveApprovers(r);
      if (approvers.includes(userId)) mine.push(r);
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

    switch (step.approverType) {
      case 'USER':
        return step.approverValue ? [step.approverValue] : [];
      case 'DESIGNATION': {
        const emps = await this.prisma.employee.findMany({
          where: {
            tenantId: request.tenantId,
            designation: step.approverValue ?? '',
          },
          select: { userId: true },
        });
        return emps.map((e) => e.userId);
      }
      case 'REPORTING_MANAGER': {
        const subject = await this.subjectEmployee(request.entityType, request.entityId);
        if (!subject?.managerId) return [];
        const mgr = await this.prisma.employee.findUnique({
          where: { id: subject.managerId },
          select: { userId: true },
        });
        return mgr ? [mgr.userId] : [];
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
        return head ? [head.userId] : [];
      }
      default:
        return [];
    }
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
}

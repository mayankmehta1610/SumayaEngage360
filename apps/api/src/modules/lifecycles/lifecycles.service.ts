import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddLifecycleDocumentDto, AddLifecycleTaskDto, EnsureLifecycleDto, UpdateLifecycleCaseDto, UpdateLifecycleDocumentDto, UpdateLifecycleStageDto, UpdateLifecycleTaskDto } from './lifecycles.dto';
import { LIFECYCLE_TEMPLATES, lifecycleTemplate } from './lifecycle.templates';

const detailInclude = {
  stages: {
    orderBy: { sequence: 'asc' as const },
    include: {
      tasks: { orderBy: { createdAt: 'asc' as const } },
      documents: { orderBy: { createdAt: 'asc' as const } },
    },
  },
  activities: { orderBy: { createdAt: 'desc' as const }, take: 100 },
};

@Injectable()
export class LifecyclesService {
  constructor(private readonly prisma: PrismaService) {}

  templates() {
    return Object.entries(LIFECYCLE_TEMPLATES).map(([code, template]) => ({ code, name: template.name, entityTypes: template.entityTypes, stages: template.stages.map((s) => ({ key: s.key, title: s.title, description: s.description, tasks: s.tasks.length, documents: s.documents?.length ?? 0 })) }));
  }

  async ensure(tenantId: string, dto: EnsureLifecycleDto, actorId: string, actorName: string) {
    const workflowCode = dto.workflowCode.trim().toUpperCase();
    const entityType = dto.entityType.trim().toUpperCase();
    const template = lifecycleTemplate(workflowCode);
    if (!template) throw new BadRequestException(`Unsupported lifecycle workflow: ${workflowCode}`);
    if (!template.entityTypes.includes(entityType)) throw new BadRequestException(`${workflowCode} does not support entity type ${entityType}`);
    await this.assertEntity(tenantId, entityType, dto.entityId);

    const existing = await this.prisma.lifecycleCase.findUnique({ where: { tenantId_entityType_entityId_workflowCode: { tenantId, entityType, entityId: dto.entityId, workflowCode } }, include: detailInclude });
    if (existing) return existing;

    const created = await this.prisma.lifecycleCase.create({
      data: {
        tenantId, entityType, entityId: dto.entityId, workflowCode,
        title: dto.title.trim(), status: 'ACTIVE', currentStageKey: template.stages[0]?.key,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        stages: {
          create: template.stages.map((stage, sequence) => ({
            stageKey: stage.key, sequence, title: stage.title, description: stage.description,
            ownerRole: stage.ownerRole, status: sequence === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
            startedAt: sequence === 0 ? new Date() : undefined,
            tasks: { create: stage.tasks.map((item) => ({
              taskCode: item.code, title: item.title, description: item.description,
              required: item.required ?? true, ownerRole: item.ownerRole,
              data: { fieldDefinitions: item.fields ?? [], values: {} },
            })) },
            documents: { create: (stage.documents ?? []).map((item) => ({
              documentCode: item.code, title: item.title, category: item.category,
              description: item.description, required: item.required ?? true, assignedTo: item.assignedTo,
            })) },
          })),
        },
        activities: { create: { action: 'LIFECYCLE_CREATED', actorId, actorName, details: { workflowCode, entityType } } },
      }, include: detailInclude,
    });
    return this.recalculate(tenantId, created.id, actorId, actorName, false);
  }

  list(tenantId: string, workflowCode?: string, entityType?: string, entityId?: string) {
    return this.prisma.lifecycleCase.findMany({
      where: { tenantId, ...(workflowCode ? { workflowCode: workflowCode.toUpperCase() } : {}), ...(entityType ? { entityType: entityType.toUpperCase() } : {}), ...(entityId ? { entityId } : {}) },
      include: { stages: { select: { id: true, stageKey: true, title: true, status: true, sequence: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async detail(tenantId: string, id: string) {
    const found = await this.prisma.lifecycleCase.findFirst({ where: { id, tenantId }, include: detailInclude });
    if (!found) throw new NotFoundException('Lifecycle case not found');
    return found;
  }

  async updateCase(tenantId: string, id: string, dto: UpdateLifecycleCaseDto, actorId: string, actorName: string) {
    await this.detail(tenantId, id);
    await this.prisma.lifecycleCase.update({ where: { id }, data: {
      ...(dto.status ? { status: dto.status } : {}), ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId || null } : {}),
      ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName || null } : {}), ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null } : {}),
      ...(dto.metadata ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
    }});
    await this.activity(id, undefined, 'CASE_UPDATED', actorId, actorName, dto);
    return this.detail(tenantId, id);
  }

  async updateStage(tenantId: string, id: string, dto: UpdateLifecycleStageDto, actorId: string, actorName: string) {
    const stage = await this.ownedStage(tenantId, id);
    await this.prisma.lifecycleStage.update({ where: { id }, data: {
      ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId || null } : {}), ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName || null } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}), ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
    }});
    await this.activity(stage.caseId, id, 'STAGE_UPDATED', actorId, actorName, dto);
    return this.recalculate(tenantId, stage.caseId, actorId, actorName, false);
  }

  async updateTask(tenantId: string, id: string, dto: UpdateLifecycleTaskDto, actorId: string, actorName: string) {
    const task = await this.ownedTask(tenantId, id);
    await this.prisma.lifecycleTask.update({ where: { id }, data: {
      ...(dto.status ? { status: dto.status, completedAt: ['COMPLETED', 'WAIVED'].includes(dto.status) ? new Date() : null, completedBy: ['COMPLETED', 'WAIVED'].includes(dto.status) ? actorId : null } : {}),
      ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId || null } : {}), ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName || null } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}), ...(dto.evidenceNote !== undefined ? { evidenceNote: dto.evidenceNote || null } : {}),
      ...(dto.data ? { data: dto.data as Prisma.InputJsonValue } : {}),
    }});
    await this.activity(task.stage.caseId, task.stageId, 'TASK_UPDATED', actorId, actorName, { taskId: id, title: task.title, ...dto });
    return this.recalculate(tenantId, task.stage.caseId, actorId, actorName, false);
  }

  async updateDocument(tenantId: string, id: string, dto: UpdateLifecycleDocumentDto, actorId: string, actorName: string) {
    const item = await this.ownedDocument(tenantId, id);
    if (dto.status === 'REJECTED' && !dto.rejectionReason?.trim()) throw new BadRequestException('A rejection reason is required');
    if (dto.status === 'VERIFIED' && !item.fileId && !dto.fileId && !dto.referenceNumber) throw new BadRequestException('Upload a file or enter an official reference before verification');
    const status = dto.status;
    await this.prisma.lifecycleDocument.update({ where: { id }, data: {
      ...(status ? { status, uploadedAt: status === 'RECEIVED' && !item.uploadedAt ? new Date() : item.uploadedAt, verifiedAt: status === 'VERIFIED' ? new Date() : null, verifiedBy: status === 'VERIFIED' ? actorId : null, rejectionReason: status === 'REJECTED' ? dto.rejectionReason : null } : {}),
      ...(dto.assignedTo !== undefined ? { assignedTo: dto.assignedTo || null } : {}), ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName || null } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}), ...(dto.fileId !== undefined ? { fileId: dto.fileId || null } : {}),
      ...(dto.fileName !== undefined ? { fileName: dto.fileName || null } : {}), ...(dto.referenceNumber !== undefined ? { referenceNumber: dto.referenceNumber || null } : {}),
      ...(dto.issuedAt !== undefined ? { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null } : {}), ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
    }});
    await this.activity(item.stage.caseId, item.stageId, 'DOCUMENT_UPDATED', actorId, actorName, { documentId: id, title: item.title, ...dto });
    return this.recalculate(tenantId, item.stage.caseId, actorId, actorName, false);
  }

  async addTask(tenantId: string, stageId: string, dto: AddLifecycleTaskDto, actorId: string, actorName: string) {
    const stage = await this.ownedStage(tenantId, stageId);
    const taskCode = `custom_${Date.now()}`;
    await this.prisma.lifecycleTask.create({ data: { stageId, taskCode, title: dto.title.trim(), description: dto.description, required: dto.required ?? false, ownerRole: dto.ownerRole, data: { fieldDefinitions: [], values: {} } } });
    await this.activity(stage.caseId, stageId, 'TASK_ADDED', actorId, actorName, { taskCode, title: dto.title });
    return this.recalculate(tenantId, stage.caseId, actorId, actorName, false);
  }

  async addDocument(tenantId: string, stageId: string, dto: AddLifecycleDocumentDto, actorId: string, actorName: string) {
    const stage = await this.ownedStage(tenantId, stageId);
    const documentCode = `custom_${Date.now()}`;
    await this.prisma.lifecycleDocument.create({ data: { stageId, documentCode, title: dto.title.trim(), category: dto.category, description: dto.description, required: dto.required ?? false, assignedTo: dto.assignedTo } });
    await this.activity(stage.caseId, stageId, 'DOCUMENT_ADDED', actorId, actorName, { documentCode, title: dto.title });
    return this.recalculate(tenantId, stage.caseId, actorId, actorName, false);
  }

  async recalculate(tenantId: string, caseId: string, actorId: string, actorName: string, log = true) {
    const found = await this.detail(tenantId, caseId);
    let required = 0; let complete = 0; let blocked = false;
    const stageUpdates: Array<ReturnType<typeof this.prisma.lifecycleStage.update>> = [];
    for (const stage of found.stages) {
      const requiredTasks = stage.tasks.filter((t) => t.required);
      const requiredDocs = stage.documents.filter((d) => d.required);
      const stageRequired = requiredTasks.length + requiredDocs.length;
      const stageComplete = requiredTasks.filter((t) => ['COMPLETED', 'WAIVED'].includes(t.status)).length + requiredDocs.filter((d) => ['VERIFIED', 'WAIVED'].includes(d.status)).length;
      const stageBlocked = stage.tasks.some((t) => t.status === 'BLOCKED') || stage.documents.some((d) => ['REJECTED', 'EXPIRED'].includes(d.status));
      const hasStarted = stage.tasks.some((t) => t.status !== 'PENDING') || stage.documents.some((d) => !['ASSIGNED', 'REQUESTED'].includes(d.status));
      const status = stageRequired > 0 && stageComplete === stageRequired ? 'COMPLETED' : stageBlocked ? 'BLOCKED' : hasStarted || stage.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
      required += stageRequired; complete += stageComplete; blocked ||= stageBlocked;
      if (status !== stage.status) stageUpdates.push(this.prisma.lifecycleStage.update({ where: { id: stage.id }, data: { status, startedAt: status === 'IN_PROGRESS' && !stage.startedAt ? new Date() : stage.startedAt, completedAt: status === 'COMPLETED' ? stage.completedAt ?? new Date() : null } }));
    }
    if (stageUpdates.length) await this.prisma.$transaction(stageUpdates);
    const refreshedStages = await this.prisma.lifecycleStage.findMany({ where: { caseId }, orderBy: { sequence: 'asc' } });
    const firstIncomplete = refreshedStages.find((s) => s.status !== 'COMPLETED');
    if (firstIncomplete && firstIncomplete.status === 'NOT_STARTED') await this.prisma.lifecycleStage.update({ where: { id: firstIncomplete.id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    const progress = required ? Math.round((complete / required) * 100) : 0;
    const status = progress === 100 ? 'COMPLETED' : blocked ? 'BLOCKED' : 'ACTIVE';
    await this.prisma.lifecycleCase.update({ where: { id: caseId }, data: { progress, status, currentStageKey: firstIncomplete?.stageKey ?? refreshedStages.at(-1)?.stageKey } });
    if (log) await this.activity(caseId, undefined, 'PROGRESS_RECALCULATED', actorId, actorName, { progress, status });
    return this.detail(tenantId, caseId);
  }

  private async assertEntity(tenantId: string, type: string, id: string) {
    let found = 0;
    if (type === 'CANDIDATE') found = await this.prisma.candidate.count({ where: { id, tenantId } });
    if (type === 'APPLICATION') found = await this.prisma.application.count({ where: { id, tenantId } });
    if (type === 'WORK_AUTHORIZATION') found = await this.prisma.workAuthorizationCase.count({ where: { id, tenantId } });
    if (type === 'ONBOARDING_CASE') found = await this.prisma.onboardingCase.count({ where: { id, tenantId } });
    if (type === 'EMPLOYEE') found = await this.prisma.employee.count({ where: { id, tenantId } });
    if (type === 'RESIGNATION') found = await this.prisma.resignation.count({ where: { id, tenantId } });
    if (type === 'CONTRACTOR_ASSIGNMENT') found = await this.prisma.contractorAssignment.count({ where: { id, tenantId } });
    if (type === 'AGENCY_SUBMISSION') found = await this.prisma.agencyClientSubmission.count({ where: { id, agencyTenantId: tenantId } });
    if (!found) throw new NotFoundException(`${type} record not found in this tenant`);
  }

  private async ownedStage(tenantId: string, id: string) {
    const stage = await this.prisma.lifecycleStage.findFirst({ where: { id, case: { tenantId } } });
    if (!stage) throw new NotFoundException('Lifecycle stage not found');
    return stage;
  }
  private async ownedTask(tenantId: string, id: string) {
    const task = await this.prisma.lifecycleTask.findFirst({ where: { id, stage: { case: { tenantId } } }, include: { stage: true } });
    if (!task) throw new NotFoundException('Lifecycle task not found');
    return task;
  }
  private async ownedDocument(tenantId: string, id: string) {
    const item = await this.prisma.lifecycleDocument.findFirst({ where: { id, stage: { case: { tenantId } } }, include: { stage: true } });
    if (!item) throw new NotFoundException('Lifecycle document not found');
    return item;
  }
  private activity(caseId: string, stageId: string | undefined, action: string, actorId: string, actorName: string, details: unknown) {
    return this.prisma.lifecycleActivity.create({ data: { caseId, stageId, action, actorId, actorName, details: details as Prisma.InputJsonValue } });
  }
}

import { DatePipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'e360-lifecycle-wizard',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="e360-lifecycle-shell">
      @if (loading) {
        <div class="e360-lifecycle-loading"><span class="e360-spinner"></span> Preparing the complete workflow…</div>
      } @else if (error) {
        <div class="e360-error">{{ error }} <button class="secondary" (click)="ensure()">Retry</button></div>
      } @else if (lifecycle) {
        <header class="e360-lifecycle-hero">
          <div>
            <div class="e360-eyebrow">Operational lifecycle</div>
            <h2>{{ lifecycle.title }}</h2>
            <p>{{ lifecycle.workflowCode.replaceAll('_', ' ') }} · Updated {{ lifecycle.updatedAt | date:'medium' }}</p>
          </div>
          <div class="e360-progress-orb" [style.--progress]="lifecycle.progress + '%'">
            <strong>{{ lifecycle.progress }}%</strong><span>complete</span>
          </div>
        </header>

        <div class="e360-lifecycle-summary">
          <div><span>Workflow status</span><strong class="e360-status-pill" [class]="statusClass(lifecycle.status)">{{ human(lifecycle.status) }}</strong></div>
          <div><span>Required work</span><strong>{{ completedRequired }}/{{ totalRequired }}</strong></div>
          <div><span>Documents</span><strong>{{ verifiedDocuments }}/{{ requiredDocuments }} verified</strong></div>
          <div><span>Blockers</span><strong [class.e360-danger-text]="blockers.length">{{ blockers.length }}</strong></div>
          <div><span>Target date</span><strong>{{ lifecycle.targetDate ? (lifecycle.targetDate | date:'mediumDate') : 'Not set' }}</strong></div>
        </div>

        @if (blockers.length) {
          <div class="e360-blocker-strip"><strong>Action required</strong><span>{{ blockers.slice(0, 3).join(' · ') }}</span></div>
        }

        <div class="e360-stage-tabs" role="tablist" aria-label="Lifecycle stages">
          @for (stage of lifecycle.stages; track stage.id; let index = $index) {
            <button type="button" class="e360-stage-tab" [class.active]="stage.id === selectedStageId" [class.complete]="stage.status === 'COMPLETED'" [class.blocked]="stage.status === 'BLOCKED'" (click)="openStage(stage.id)">
              <span class="e360-stage-number">@if (stage.status === 'COMPLETED') { ✓ } @else { {{ index + 1 }} }</span>
              <span><strong>{{ stage.title }}</strong><small>{{ stageProgress(stage) }}% · {{ human(stage.status) }}</small></span>
            </button>
          }
        </div>

        @if (selectedStage; as stage) {
          <article class="e360-stage-panel">
            <div class="e360-stage-heading">
              <div><div class="e360-eyebrow">Stage {{ stage.sequence + 1 }} of {{ lifecycle.stages.length }}</div><h3>{{ stage.title }}</h3><p>{{ stage.description }}</p></div>
              <span class="e360-status-pill" [class]="statusClass(stage.status)">{{ human(stage.status) }}</span>
            </div>

            <div class="e360-subtabs">
              <button [class.active]="subtab === 'overview'" (click)="subtab='overview'">Overview</button>
              <button [class.active]="subtab === 'tasks'" (click)="subtab='tasks'">Data & tasks <span>{{ taskDone(stage) }}/{{ stage.tasks.length }}</span></button>
              <button [class.active]="subtab === 'documents'" (click)="subtab='documents'">Documents <span>{{ docDone(stage) }}/{{ stage.documents.length }}</span></button>
              <button [class.active]="subtab === 'history'" (click)="subtab='history'">History</button>
            </div>

            @if (subtab === 'overview') {
              <div class="e360-stage-overview">
                <div class="e360-completion-card"><span>Stage completion</span><strong>{{ stageProgress(stage) }}%</strong><div class="e360-meter"><i [style.width.%]="stageProgress(stage)"></i></div><p>{{ pendingSummary(stage) }}</p></div>
                <div class="e360-form-section"><h4>Ownership and schedule</h4><div class="e360-form-grid three">
                  <div><label>Responsible role</label><input [value]="stage.ownerRole ?? 'Unassigned'" readonly /></div>
                  <div><label>Named owner</label><input [(ngModel)]="stage.ownerName" placeholder="Person responsible" /></div>
                  <div><label>Due date</label><input type="date" [ngModel]="dateValue(stage.dueDate)" (ngModelChange)="stage.dueDate=$event" /></div>
                </div><div><label>Stage notes and handoff instructions</label><textarea rows="4" [(ngModel)]="stage.notes" placeholder="Record decisions, dependencies, exceptions and the next handoff…"></textarea></div><button (click)="saveStage(stage)">Save stage ownership</button></div>
                <div class="e360-form-section"><h4>Case controls</h4><div class="e360-form-grid three">
                  <div><label>Case priority</label><select [(ngModel)]="lifecycle.priority"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></div>
                  <div><label>Overall owner</label><input [(ngModel)]="lifecycle.ownerName" placeholder="Case owner" /></div>
                  <div><label>Overall target date</label><input type="date" [ngModel]="dateValue(lifecycle.targetDate)" (ngModelChange)="lifecycle.targetDate=$event" /></div>
                </div><button class="secondary" (click)="saveCase()">Save case controls</button></div>
              </div>
            }

            @if (subtab === 'tasks') {
              <div class="e360-work-list">
                @for (task of stage.tasks; track task.id) {
                  <section class="e360-work-card" [class.done]="isTaskDone(task)" [class.blocked]="task.status === 'BLOCKED'">
                    <header><div class="e360-work-check">{{ isTaskDone(task) ? '✓' : '•' }}</div><div><h4>{{ task.title }} @if (task.required) { <span class="e360-required">Required</span> }</h4><p>{{ task.description || 'Complete the relevant information and record evidence before closing this task.' }}</p></div><select [(ngModel)]="task.status"><option>PENDING</option><option>IN_PROGRESS</option><option>BLOCKED</option><option>COMPLETED</option><option>WAIVED</option></select></header>
                    @if (task.data?.fieldDefinitions?.length) {
                      <div class="e360-form-grid three">
                        @for (field of task.data.fieldDefinitions; track field.key) {
                          <div [class.full]="field.type === 'TEXTAREA'">
                            <label>{{ field.label }} @if (field.required) { <em>*</em> }</label>
                            @if (field.type === 'TEXTAREA') { <textarea rows="3" [ngModel]="taskValue(task, field.key)" (ngModelChange)="setTaskValue(task, field.key, $event)"></textarea> }
                            @else if (field.type === 'SELECT') { <select [ngModel]="taskValue(task, field.key)" (ngModelChange)="setTaskValue(task, field.key, $event)"><option value="">Select</option>@for (option of field.options ?? []; track option) { <option [value]="option">{{ option }}</option> }</select> }
                            @else if (field.type === 'BOOLEAN') { <select [ngModel]="taskValue(task, field.key)" (ngModelChange)="setTaskValue(task, field.key, $event)"><option [ngValue]="undefined">Select</option><option [ngValue]="true">Yes</option><option [ngValue]="false">No</option></select> }
                            @else { <input [type]="inputType(field.type)" [ngModel]="taskValue(task, field.key)" (ngModelChange)="setTaskValue(task, field.key, $event)" /> }
                          </div>
                        }
                      </div>
                    }
                    <div class="e360-evidence-row"><div><label>Owner</label><input [(ngModel)]="task.ownerName" [placeholder]="task.ownerRole || 'Assign owner'" /></div><div><label>Due date</label><input type="date" [ngModel]="dateValue(task.dueDate)" (ngModelChange)="task.dueDate=$event" /></div><div class="grow"><label>Evidence, decision or blocker note</label><input [(ngModel)]="task.evidenceNote" placeholder="What was checked, decided, or is blocking completion?" /></div><button (click)="saveTask(task)">Save</button></div>
                  </section>
                }
                <details class="e360-add-work"><summary>+ Add a case-specific task</summary><div class="e360-evidence-row"><input [(ngModel)]="newTask.title" placeholder="Task title" /><input [(ngModel)]="newTask.description" placeholder="Instructions" /><label><input type="checkbox" [(ngModel)]="newTask.required" /> Required</label><button (click)="addTask(stage)">Add task</button></div></details>
              </div>
            }

            @if (subtab === 'documents') {
              <div class="e360-document-board">
                @if (!stage.documents.length) { <div class="e360-empty-inline">No documents assigned to this stage. Add one below if this case needs additional evidence.</div> }
                @for (document of stage.documents; track document.id) {
                  <section class="e360-document-card" [class.done]="isDocumentDone(document)" [class.blocked]="document.status === 'REJECTED' || document.status === 'EXPIRED'">
                    <header><div class="e360-file-icon">▤</div><div><h4>{{ document.title }} @if (document.required) { <span class="e360-required">Required</span> }</h4><p>{{ document.category || 'Supporting evidence' }} · assigned to {{ document.assignedTo || 'case owner' }}</p></div><span class="e360-status-pill" [class]="statusClass(document.status)">{{ human(document.status) }}</span></header>
                    <div class="e360-document-steps"><span [class.on]="documentRank(document.status) >= 1">Assigned</span><i></i><span [class.on]="documentRank(document.status) >= 2">Received</span><i></i><span [class.on]="documentRank(document.status) >= 3">Review</span><i></i><span [class.on]="documentRank(document.status) >= 4">Verified</span></div>
                    <div class="e360-form-grid four">
                      <div><label>Assigned to</label><input [(ngModel)]="document.assignedTo" /></div>
                      <div><label>Owner/contact</label><input [(ngModel)]="document.ownerName" /></div>
                      <div><label>Due date</label><input type="date" [ngModel]="dateValue(document.dueDate)" (ngModelChange)="document.dueDate=$event" /></div>
                      <div><label>Status</label><select [(ngModel)]="document.status"><option>ASSIGNED</option><option>REQUESTED</option><option>RECEIVED</option><option>UNDER_REVIEW</option><option>VERIFIED</option><option>REJECTED</option><option>WAIVED</option><option>EXPIRED</option></select></div>
                      <div><label>Document/reference number</label><input [(ngModel)]="document.referenceNumber" placeholder="Use masked reference when sensitive" /></div>
                      <div><label>Issue date</label><input type="date" [ngModel]="dateValue(document.issuedAt)" (ngModelChange)="document.issuedAt=$event" /></div>
                      <div><label>Expiry date</label><input type="date" [ngModel]="dateValue(document.expiresAt)" (ngModelChange)="document.expiresAt=$event" /></div>
                      <div><label>File</label><label class="e360-upload-control"><input type="file" (change)="uploadDocument(document, $event)" /><span>{{ document.fileName || 'Choose file' }}</span></label></div>
                      @if (document.status === 'REJECTED') { <div class="full"><label>Rejection reason *</label><textarea [(ngModel)]="document.rejectionReason" placeholder="Explain exactly what must be corrected"></textarea></div> }
                      <div class="full"><label>Review notes</label><textarea rows="2" [(ngModel)]="document.notes" placeholder="Document scope, verification observation, exception, or renewal instruction…"></textarea></div>
                    </div>
                    <footer><span>@if (document.fileId) { File received } @else { Waiting for upload or official reference }</span><button (click)="saveDocument(document)">Save document</button></footer>
                  </section>
                }
                <details class="e360-add-work"><summary>+ Assign an additional document</summary><div class="e360-evidence-row"><input [(ngModel)]="newDocument.title" placeholder="Document name" /><input [(ngModel)]="newDocument.category" placeholder="Category" /><input [(ngModel)]="newDocument.assignedTo" placeholder="Assigned to" /><label><input type="checkbox" [(ngModel)]="newDocument.required" /> Required</label><button (click)="addDocument(stage)">Assign</button></div></details>
              </div>
            }

            @if (subtab === 'history') {
              <div class="e360-timeline">@for (activity of stageActivities(stage.id); track activity.id) { <div><i></i><section><strong>{{ human(activity.action) }}</strong><span>{{ activity.actorName || 'System' }} · {{ activity.createdAt | date:'medium' }}</span><p>{{ activitySummary(activity) }}</p></section></div> } @empty { <div class="e360-empty-inline">No recorded changes for this stage yet.</div> }</div>
            }

            <footer class="e360-wizard-nav"><button class="secondary" [disabled]="stage.sequence === 0" (click)="previousStage()">← Previous stage</button><span>Complete all required data and documents to close this stage.</span><button [disabled]="stage.sequence === lifecycle.stages.length - 1" (click)="nextStage()">Next stage →</button></footer>
          </article>
        }
      }
    </section>
  `,
})
export class LifecycleWizardComponent implements OnChanges {
  @Input({ required: true }) entityType = '';
  @Input({ required: true }) entityId = '';
  @Input({ required: true }) workflowCode = '';
  @Input({ required: true }) title = '';
  @Input() metadata: Record<string, unknown> = {};
  private api = inject(ApiService);
  private auth = inject(AuthService);
  lifecycle: any = null;
  selectedStageId = '';
  subtab: 'overview' | 'tasks' | 'documents' | 'history' = 'overview';
  loading = false;
  error = '';
  newTask: any = { title: '', description: '', required: false };
  newDocument: any = { title: '', category: '', assignedTo: '', required: false };

  ngOnChanges(changes: SimpleChanges) { if (changes['entityId'] || changes['workflowCode']) this.ensure(); }
  get selectedStage() { return this.lifecycle?.stages?.find((s: any) => s.id === this.selectedStageId); }
  get requiredItems() { return (this.lifecycle?.stages ?? []).flatMap((s: any) => [...s.tasks.filter((t: any) => t.required), ...s.documents.filter((d: any) => d.required)]); }
  get totalRequired() { return this.requiredItems.length; }
  get completedRequired() { return this.requiredItems.filter((item: any) => item.taskCode ? this.isTaskDone(item) : this.isDocumentDone(item)).length; }
  get requiredDocuments() { return (this.lifecycle?.stages ?? []).flatMap((s: any) => s.documents).filter((d: any) => d.required).length; }
  get verifiedDocuments() { return (this.lifecycle?.stages ?? []).flatMap((s: any) => s.documents).filter((d: any) => d.required && this.isDocumentDone(d)).length; }
  get blockers() {
    if (!this.lifecycle) return [];
    return this.lifecycle.stages.flatMap((s: any) => [
      ...s.tasks.filter((t: any) => t.status === 'BLOCKED').map((t: any) => `${s.title}: ${t.title}`),
      ...s.documents.filter((d: any) => ['REJECTED', 'EXPIRED'].includes(d.status)).map((d: any) => `${s.title}: ${d.title} ${this.human(d.status).toLowerCase()}`),
    ]);
  }

  async ensure() {
    if (!this.entityId || !this.workflowCode) return;
    this.loading = true; this.error = '';
    try {
      this.setLifecycle(await this.api.post('/lifecycle-cases/ensure', { entityType: this.entityType, entityId: this.entityId, workflowCode: this.workflowCode, title: this.title, metadata: this.metadata }));
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
  setLifecycle(value: any) {
    const previous = this.selectedStageId;
    this.lifecycle = value;
    this.selectedStageId = value.stages.some((s: any) => s.id === previous) ? previous : value.stages.find((s: any) => s.stageKey === value.currentStageKey)?.id ?? value.stages[0]?.id;
  }
  openStage(id: string) { this.selectedStageId = id; this.subtab = 'overview'; }
  human(value: string) { return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
  statusClass(status: string) { return `status-${String(status).toLowerCase().replaceAll('_', '-')}`; }
  dateValue(value: string | Date | null) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  inputType(type: string) { return type === 'DATE' ? 'date' : type === 'NUMBER' ? 'number' : type === 'EMAIL' ? 'email' : type === 'PHONE' ? 'tel' : 'text'; }
  isTaskDone(task: any) { return ['COMPLETED', 'WAIVED'].includes(task.status); }
  isDocumentDone(document: any) { return ['VERIFIED', 'WAIVED'].includes(document.status); }
  taskDone(stage: any) { return stage.tasks.filter((t: any) => this.isTaskDone(t)).length; }
  docDone(stage: any) { return stage.documents.filter((d: any) => this.isDocumentDone(d)).length; }
  stageProgress(stage: any) { const items = [...stage.tasks.filter((t: any) => t.required), ...stage.documents.filter((d: any) => d.required)]; return items.length ? Math.round(items.filter((i: any) => i.taskCode ? this.isTaskDone(i) : this.isDocumentDone(i)).length / items.length * 100) : 0; }
  pendingSummary(stage: any) { const tasks = stage.tasks.filter((t: any) => t.required && !this.isTaskDone(t)).length; const docs = stage.documents.filter((d: any) => d.required && !this.isDocumentDone(d)).length; return tasks || docs ? `${tasks} required task(s) and ${docs} required document(s) remain.` : 'All required work in this stage is complete.'; }
  taskValue(task: any, key: string) { return task.data?.values?.[key]; }
  setTaskValue(task: any, key: string, value: any) { task.data ??= {}; task.data.values ??= {}; task.data.values[key] = value; }
  documentRank(status: string) { return ({ ASSIGNED: 1, REQUESTED: 1, RECEIVED: 2, UNDER_REVIEW: 3, VERIFIED: 4, WAIVED: 4, REJECTED: 3, EXPIRED: 2 } as any)[status] ?? 0; }
  stageActivities(stageId: string) { return (this.lifecycle?.activities ?? []).filter((a: any) => a.stageId === stageId); }
  activitySummary(activity: any) { const d = activity.details ?? {}; return d.title || d.status || d.progress !== undefined ? [d.title, d.status ? this.human(d.status) : '', d.progress !== undefined ? `${d.progress}% complete` : ''].filter(Boolean).join(' · ') : 'Lifecycle information updated.'; }

  async saveCase() { await this.perform(() => this.api.patch(`/lifecycle-cases/${this.lifecycle.id}`, { ownerName: this.lifecycle.ownerName, priority: this.lifecycle.priority, targetDate: this.lifecycle.targetDate ? new Date(this.lifecycle.targetDate).toISOString() : undefined })); }
  async saveStage(stage: any) { await this.perform(() => this.api.patch(`/lifecycle-cases/stages/${stage.id}`, { ownerName: stage.ownerName, dueDate: stage.dueDate ? new Date(stage.dueDate).toISOString() : undefined, notes: stage.notes })); }
  async saveTask(task: any) {
    if (task.status === 'COMPLETED') {
      const missing = (task.data?.fieldDefinitions ?? []).filter((f: any) => f.required && (task.data?.values?.[f.key] === undefined || task.data?.values?.[f.key] === null || task.data?.values?.[f.key] === '')).map((f: any) => f.label);
      if (missing.length) { this.error = `Complete required fields before closing “${task.title}”: ${missing.join(', ')}`; return; }
    }
    await this.perform(() => this.api.patch(`/lifecycle-cases/tasks/${task.id}`, { status: task.status, ownerName: task.ownerName, dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined, evidenceNote: task.evidenceNote, data: task.data }));
  }
  async saveDocument(document: any) { await this.perform(() => this.api.patch(`/lifecycle-cases/documents/${document.id}`, { status: document.status, assignedTo: document.assignedTo, ownerName: document.ownerName, dueDate: document.dueDate ? new Date(document.dueDate).toISOString() : undefined, fileId: document.fileId, fileName: document.fileName, referenceNumber: document.referenceNumber, issuedAt: document.issuedAt ? new Date(document.issuedAt).toISOString() : undefined, expiresAt: document.expiresAt ? new Date(document.expiresAt).toISOString() : undefined, rejectionReason: document.rejectionReason, notes: document.notes })); }
  async addTask(stage: any) { if (!this.newTask.title.trim()) return; await this.perform(() => this.api.post(`/lifecycle-cases/stages/${stage.id}/tasks`, this.newTask)); this.newTask = { title: '', description: '', required: false }; }
  async addDocument(stage: any) { if (!this.newDocument.title.trim()) return; await this.perform(() => this.api.post(`/lifecycle-cases/stages/${stage.id}/documents`, this.newDocument)); this.newDocument = { title: '', category: '', assignedTo: '', required: false }; }
  async uploadDocument(document: any, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.loading = true; this.error = '';
    try {
      const form = new FormData(); form.append('file', file);
      const headers: Record<string, string> = {};
      if (this.auth.token) headers['Authorization'] = `Bearer ${this.auth.token}`;
      if (this.auth.tenant) headers['x-tenant-id'] = this.auth.tenant;
      const response = await fetch(`${environment.apiBase}/files`, { method: 'POST', headers, body: form });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'File upload failed');
      const uploaded = await response.json(); document.fileId = uploaded.id; document.fileName = uploaded.fileName; document.status = 'RECEIVED'; await this.saveDocument(document);
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
  previousStage() { const index = this.lifecycle.stages.findIndex((s: any) => s.id === this.selectedStageId); if (index > 0) this.openStage(this.lifecycle.stages[index - 1].id); }
  nextStage() { const index = this.lifecycle.stages.findIndex((s: any) => s.id === this.selectedStageId); if (index < this.lifecycle.stages.length - 1) this.openStage(this.lifecycle.stages[index + 1].id); }
  private async perform(action: () => Promise<any>) { this.error = ''; try { this.setLifecycle(await action()); } catch (e) { this.error = errMsg(e); } }
}

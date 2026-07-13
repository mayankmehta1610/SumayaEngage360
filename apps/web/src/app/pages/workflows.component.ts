import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [ModuleShellComponent, FormsModule],
  template: `
    <e360-module-shell
      title="Workflow designer"
      description="Configure ordered approvers, resolution rules, and versioned approval definitions."
      icon="git-branch"
      moduleKey="workflows"
      auditEntityType="WORKFLOW"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Workflow' }, { label: 'Workflows' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Create approval workflow</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="form.name" placeholder="Timesheet manager approval" /></div>
        <div><label>Business object</label><select [(ngModel)]="form.entityType">@for (entity of entities; track entity) { <option [value]="entity">{{ entity }}</option> }</select></div>
      </div>
      @for (step of form.steps; track $index; let index = $index) {
        <div class="row">
          <strong style="flex:0">Step {{ index + 1 }}</strong>
          <div><label>Approver resolution</label><select [(ngModel)]="step.approverType"><option value="REPORTING_MANAGER">Reporting manager</option><option value="DEPARTMENT_HEAD">Department head</option><option value="DESIGNATION">Designation</option><option value="USER">Named user</option></select></div>
          @if (step.approverType === 'DESIGNATION') { <div><label>Designation</label><select [(ngModel)]="step.approverValue"><option value="">Select designation</option>@for (designation of designations; track designation.id) { <option [value]="designation.name">{{ designation.name }}</option> }</select></div> }
          @if (step.approverType === 'USER') { <div><label>User</label><select [(ngModel)]="step.approverValue"><option value="">Select user</option>@for (user of users; track user.id) { <option [value]="user.id">{{ user.firstName }} {{ user.lastName }} ({{ user.email }})</option> }</select></div> }
          <button class="danger" style="flex:0" (click)="removeStep(index)" [disabled]="form.steps.length === 1">Remove</button>
        </div>
      }
      <button class="secondary" (click)="addStep()">Add approval step</button>
      <button style="margin-left:.5rem" (click)="create()" [disabled]="busy">Create workflow</button>
    </div>
    @for (w of workflows; track w.id) {
      <div class="card">
        <h2>{{ w.name }} ({{ w.entityType }})</h2>
        <p class="muted">Steps: @for (s of w.steps; track s.id) { {{ s.stepOrder }}. {{ s.approverType }} → }</p>
        <p>Versions: {{ w.versions?.length ?? 0 }}
          <button (click)="snapshot(w.id)">Save version snapshot</button>
        </p>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class WorkflowsComponent implements OnInit {
  private api = inject(ApiService);
  workflows: any[] = []; users: any[] = []; designations: any[] = []; error = ''; busy = false;
  entities = ['ONBOARDING', 'RESIGNATION', 'TIMESHEET', 'OFFER', 'ALLOCATION', 'EXIT_CLEARANCE', 'OTHER'];
  form: any = { name: '', entityType: 'TIMESHEET', steps: [{ approverType: 'REPORTING_MANAGER', approverValue: '' }] };

  async ngOnInit() {
    try { [this.workflows, this.users, this.designations] = await Promise.all([this.api.get<any[]>('/approvals/workflows'), this.api.get<any[]>('/users'), this.api.get<any[]>('/designations')]); }
    catch (e) { this.error = errMsg(e); }
  }
  async snapshot(id: string) {
    const wf = this.workflows.find((w) => w.id === id);
    await this.api.post(`/approvals/workflows/${id}/versions`, {
      definition: { steps: wf?.steps, savedAt: new Date().toISOString() },
    });
    this.workflows = await this.api.get<any[]>('/approvals/workflows');
  }
  addStep() { this.form.steps.push({ approverType: 'REPORTING_MANAGER', approverValue: '' }); }
  removeStep(index: number) { if (this.form.steps.length > 1) this.form.steps.splice(index, 1); }
  async create() {
    this.error = '';
    if (!this.form.name.trim()) { this.error = 'Workflow name is required.'; return; }
    if (this.form.steps.some((step: any) => ['USER', 'DESIGNATION'].includes(step.approverType) && !step.approverValue)) { this.error = 'Select an approver for every named-user or designation step.'; return; }
    this.busy = true;
    try {
      await this.api.post('/approvals/workflows', { ...this.form, steps: this.form.steps.map((step: any, index: number) => ({ ...step, approverValue: step.approverValue || undefined, stepOrder: index + 1 })) });
      this.form = { name: '', entityType: 'TIMESHEET', steps: [{ approverType: 'REPORTING_MANAGER', approverValue: '' }] };
      this.workflows = await this.api.get<any[]>('/approvals/workflows');
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }
}

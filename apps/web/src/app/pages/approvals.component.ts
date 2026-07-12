import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { AuthService } from '../core/auth.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Approvals inbox"
      description="Pending approvals and workflow configuration."
      icon="check-square"
      moduleKey="approvals"
      auditEntityType="APPROVAL_REQUEST"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE, DEPARTMENT_HEAD"
      [breadcrumbs]="[{ label: 'Workflow' }, { label: 'Approvals' }]"
    >
      <div actions><export-bar [rows]="pending" [cols]="exportCols" name="pending-approvals" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <h2>My pending approvals</h2>
      <table>
        <tr><th>Type</th><th>Workflow</th><th>Step</th><th></th></tr>
        @for (r of pending; track r.id) {
          <tr>
            <td>{{ r.entityType }}</td>
            <td>{{ r.workflow.name }}</td>
            <td>{{ r.currentStep }} / {{ r.workflow.steps.length }}</td>
            <td>
              <button (click)="act(r.id, 'APPROVED')">Approve</button>
              <button class="danger" (click)="act(r.id, 'REJECTED')">Reject</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="4" class="muted">Nothing waiting on you.</td></tr> }
      </table>
    </div>

    @if (isAdmin) {
    <div class="card">
      <h2>Configure workflow</h2>
      <div class="row">
          <e360-select-field
            label="Entity"
            [options]="entityTypeOptions"
            [(ngModel)]="wf.entityType"
          />
        <div><label>Name</label><input [(ngModel)]="wf.name" placeholder="Default resignation chain" /></div>
      </div>
      <label>Approval steps (executed in order)</label>
      @for (s of steps; track $index; let i = $index) {
        <div style="display:flex;gap:.5rem;align-items:center;margin:.35rem 0">
          <span class="badge">Step {{ i + 1 }}</span>
          <e360-select-field
            [compact]="true"
            [options]="stepTypeOptions"
            [(ngModel)]="s.type"
          />
          @if (s.type === 'DESIGNATION') {
            <e360-select-field
              [compact]="true"
              placeholder="choose designation…"
              [options]="designationOptions"
              [(ngModel)]="s.value"
            />
          }
          @if (s.type === 'USER') {
            <e360-select-field
              [compact]="true"
              placeholder="choose person…"
              [options]="userOptions"
              [(ngModel)]="s.value"
            />
          }
          <button class="danger" (click)="steps.splice(i, 1)" [disabled]="steps.length === 1">✕</button>
        </div>
      }
      <button class="secondary" (click)="steps.push({ type: 'REPORTING_MANAGER' })">+ Add step</button>
      <button style="margin-left:.5rem" (click)="createWorkflow()" [disabled]="!wf.name">Save workflow</button>
    </div>

    <div class="card">
      <h2>Active workflows</h2>
      <table>
        <tr><th>Entity</th><th>Name</th><th>Steps</th></tr>
        @for (w of workflows; track w.id) {
          <tr>
            <td>{{ w.entityType }}</td><td>{{ w.name }}</td>
            <td>
              @for (s of w.steps; track s.id) {
                <span class="badge" style="margin-right:.25rem">{{ s.stepOrder }}. {{ s.approverType }}{{ s.approverValue ? ':' + s.approverValue : '' }}</span>
              }
            </td>
          </tr>
        }
      </table>
    </div>
    }
  
    </e360-module-shell>
  `,
})
export class ApprovalsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  pending: any[] = [];
  workflows: any[] = [];
  error = '';
  exportCols = [
    { key: 'entityType', label: 'Type' },
    { key: 'workflow.name', label: 'Workflow' },
    { key: 'currentStep', label: 'Step' },
    { key: 'createdAt', label: 'Raised' },
  ];
  wf: any = { entityType: 'RESIGNATION' };
  steps: { type: string; value?: string }[] = [{ type: 'REPORTING_MANAGER' }];
  designations: any[] = [];
  users: any[] = [];
  entityTypeOptions: SelectOption[] = [
    { value: 'ALLOCATION', label: 'ALLOCATION' },
    { value: 'OFFER', label: 'OFFER' },
    { value: 'ONBOARDING', label: 'ONBOARDING' },
    { value: 'RESIGNATION', label: 'RESIGNATION' },
    { value: 'TIMESHEET', label: 'TIMESHEET' },
  ];
  stepTypeOptions: SelectOption[] = [
    { value: 'DEPARTMENT_HEAD', label: 'Department head' },
    { value: 'DESIGNATION', label: 'Anyone with designation…' },
    { value: 'REPORTING_MANAGER', label: 'Reporting manager' },
    { value: 'USER', label: 'Specific person…' },
  ];

  get designationOptions(): SelectOption[] {
    return this.designations.map((d) => ({ value: d.name, label: d.name }));
  }

  get userOptions(): SelectOption[] {
    return this.users.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${u.email})`,
    }));
  }

  get isAdmin() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.pending = await this.api.get<any[]>('/approvals/pending'); } catch { this.pending = []; }
    if (this.isAdmin) {
      try { this.workflows = await this.api.get<any[]>('/approvals/workflows'); } catch { this.workflows = []; }
      try { this.designations = await this.api.get<any[]>('/designations'); } catch {}
      try { this.users = await this.api.get<any[]>('/users'); } catch {}
    }
  }
  async act(id: string, action: string) {
    try { await this.api.post(`/approvals/${id}/act`, { action }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async createWorkflow() {
    this.error = '';
    try {
      const steps = this.steps.map((s, i) => ({
        stepOrder: i + 1,
        approverType: s.type,
        approverValue: s.value || undefined,
      }));
      await this.api.post('/approvals/workflows', { ...this.wf, steps });
      this.wf = { entityType: 'RESIGNATION' };
      this.steps = [{ type: 'REPORTING_MANAGER' }];
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}

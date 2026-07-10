import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Approvals</h1>
      <export-bar [rows]="pending" [cols]="exportCols" name="pending-approvals" />
    </div>
    @if (error) { <div class="error">{{ error }}</div> }

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

    <div class="card">
      <h2>Configure workflow</h2>
      <div class="row">
        <div>
          <label>Entity</label>
          <select [(ngModel)]="wf.entityType">
            <option>ONBOARDING</option><option>RESIGNATION</option><option>TIMESHEET</option>
            <option>OFFER</option><option>ALLOCATION</option>
          </select>
        </div>
        <div><label>Name</label><input [(ngModel)]="wf.name" placeholder="Default resignation chain" /></div>
      </div>
      <label>Steps — one per line: <code>DESIGNATION:HR Manager</code>, <code>REPORTING_MANAGER</code>, <code>DEPARTMENT_HEAD</code></label>
      <textarea rows="3" [(ngModel)]="stepsText" placeholder="REPORTING_MANAGER
DESIGNATION:HR Manager"></textarea>
      <button (click)="createWorkflow()">Save workflow</button>
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
  `,
})
export class ApprovalsComponent implements OnInit {
  private api = inject(ApiService);
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
  stepsText = '';

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.pending = await this.api.get<any[]>('/approvals/pending'); } catch { this.pending = []; }
    try { this.workflows = await this.api.get<any[]>('/approvals/workflows'); } catch { this.workflows = []; }
  }
  async act(id: string, action: string) {
    try { await this.api.post(`/approvals/${id}/act`, { action }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async createWorkflow() {
    this.error = '';
    try {
      const steps = this.stepsText
        .split('\n').map((s) => s.trim()).filter(Boolean)
        .map((line, i) => {
          const [type, value] = line.split(':').map((x) => x.trim());
          return { stepOrder: i + 1, approverType: type, approverValue: value || undefined };
        });
      await this.api.post('/approvals/workflows', { ...this.wf, steps });
      this.wf = { entityType: 'RESIGNATION' };
      this.stepsText = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Timesheets"
      description="Submit timesheets and approve team entries."
      icon="clock"
      moduleKey="timesheets"
      auditEntityType="TIMESHEET"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Timesheets' }]"
    >
      <div actions><export-bar [rows]="mine" [cols]="exportCols" name="my-timesheets" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <h2>Awaiting my approval</h2>
      <table>
        <tr><th>Employee</th><th>Type</th><th>Project</th><th>Period</th><th>Hours</th><th></th></tr>
        @for (t of pending; track t.id) {
          <tr>
            <td>{{ t.employee.user.firstName }} {{ t.employee.user.lastName }}</td>
            <td>{{ t.type }}</td>
            <td>{{ t.project?.name ?? '—' }}</td>
            <td>{{ t.periodStart | date }} – {{ t.periodEnd | date }}</td>
            <td>{{ totalHours(t) }}</td>
            <td>
              <button (click)="act(t.id, 'approve')">Approve</button>
              <button class="danger" (click)="act(t.id, 'discard')">Discard</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="6" class="muted">Nothing waiting on you.</td></tr> }
      </table>
    </div>

    <div class="card">
      <h2>My timesheets</h2>
      <div class="row" style="align-items:flex-end">
        <e360-select-field
          label="Type"
          [searchable]="false"
          [options]="typeOptions"
          [(ngModel)]="f.type"
        />
        <div><label>Period start</label><input type="date" [(ngModel)]="f.periodStart" /></div>
        <div><label>Period end</label><input type="date" [(ngModel)]="f.periodEnd" /></div>
        <div><label>Day worked</label><input type="date" [(ngModel)]="entry.workDate" /></div>
        <div><label>Hours</label><input type="number" [(ngModel)]="entry.hours" /></div>
        <div><label>Task</label><input [(ngModel)]="entry.task" /></div>
        <div style="flex:0"><button class="secondary" (click)="createAndSubmit()">Create + submit</button></div>
      </div>
      <table>
        <tr><th>Type</th><th>Period</th><th>Status</th><th>Note</th><th></th></tr>
        @for (t of mine; track t.id) {
          <tr>
            <td>{{ t.type }}</td>
            <td>{{ t.periodStart | date }} – {{ t.periodEnd | date }}</td>
            <td><span class="badge" [class.ok]="t.status==='APPROVED'" [class.err]="t.status==='DISCARDED'">{{ t.status }}</span></td>
            <td>{{ t.actionNote ?? '' }}</td>
            <td>@if (t.status === 'DRAFT' || t.status === 'DISCARDED') {
              <button class="secondary" (click)="submit(t.id)">Submit</button>
            }</td>
          </tr>
        }
      </table>
    </div>
  
    </e360-module-shell>
  `,
})
export class TimesheetsComponent implements OnInit {
  private api = inject(ApiService);
  pending: any[] = [];
  mine: any[] = [];
  error = '';
  exportCols = [
    { key: 'type', label: 'Type' },
    { key: 'project.name', label: 'Project' },
    { key: 'periodStart', label: 'From' },
    { key: 'periodEnd', label: 'To' },
    { key: 'status', label: 'Status' },
    { key: 'actionNote', label: 'Manager note' },
  ];
  f: any = { type: 'INTERNAL' };
  entry: any = { hours: 8 };
  typeOptions: SelectOption[] = [
    { value: 'CLIENT', label: 'CLIENT' },
    { value: 'INTERNAL', label: 'INTERNAL' },
  ];

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.mine = await this.api.get<any[]>('/timesheets/mine'); } catch { this.mine = []; }
    try { this.pending = await this.api.get<any[]>('/timesheets/pending-approval'); } catch { this.pending = []; }
  }
  totalHours(t: any) {
    return (t.entries ?? []).reduce((s: number, e: any) => s + Number(e.hours), 0);
  }
  async createAndSubmit() {
    this.error = '';
    try {
      const ts = await this.api.post<any>('/timesheets', {
        type: this.f.type,
        periodStart: new Date(this.f.periodStart).toISOString(),
        periodEnd: new Date(this.f.periodEnd).toISOString(),
        entries: [{
          workDate: new Date(this.entry.workDate).toISOString(),
          hours: Number(this.entry.hours),
          task: this.entry.task,
        }],
      });
      await this.api.post(`/timesheets/${ts.id}/submit`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async submit(id: string) {
    try { await this.api.post(`/timesheets/${id}/submit`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async act(id: string, action: 'approve' | 'discard') {
    try { await this.api.post(`/timesheets/${id}/${action}`, { note: '' }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}

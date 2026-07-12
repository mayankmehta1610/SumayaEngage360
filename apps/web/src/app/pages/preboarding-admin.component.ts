import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Preboarding"
      description="CFG-004 — personal data & onboarding tasks"
      icon="clipboard-check"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Workforce' }, { label: 'Preboarding' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Onboarding tasks</h2>
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.employee }}</td>
          <td>{{ row.type }}</td>
          <td>{{ row.title }}</td>
          <td>{{ row.status }}</td>
          <td>@if (row.status !== 'COMPLETED') { <button (click)="complete(row.id)">Complete</button> }</td>
        </ng-template>
      </e360-data-table>
    </div>
    <div class="card">
      <h2>Init tasks for employee</h2>
      <input [(ngModel)]="employeeId" placeholder="Employee UUID" />
      <button (click)="init()">Init IT/Buddy/Induction tasks</button>
    </div>
  
    </e360-module-shell>
  `,
})
export class PreboardingAdminComponent implements OnInit {
  private api = inject(ApiService);
  tasks: any[] = []; employeeId = ''; error = '';
  tableCols: TableColumn[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.tasks.map((t) => ({
      id: t.id,
      employee: t.employeeId?.slice(0, 8) ?? '—',
      type: t.taskType,
      title: t.title,
      status: t.status,
    }));
  }

  async ngOnInit() {
    try { this.tasks = await this.api.get<any[]>('/preboarding/tasks'); }
    catch (e) { this.error = errMsg(e); }
  }
  async complete(id: string) {
    await this.api.patch(`/preboarding/tasks/${id}/complete`);
    this.tasks = await this.api.get<any[]>('/preboarding/tasks');
  }
  async init() {
    await this.api.post(`/preboarding/tasks/init/${this.employeeId}`, {});
    this.tasks = await this.api.get<any[]>('/preboarding/tasks');
  }
}

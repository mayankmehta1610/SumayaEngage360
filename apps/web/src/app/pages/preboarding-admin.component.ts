import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
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
      <e360-select-field placeholder="Select employee" [options]="employeeOptions" [(ngModel)]="employeeId" />
      <button (click)="init()" [disabled]="!employeeId">Init IT/Buddy/Induction tasks</button>
      <h3>Add a custom onboarding task</h3>
      <div class="row">
        <select [(ngModel)]="newTask.taskType"><option value="DOCUMENT">Document</option><option value="IT_ACCESS">IT access</option><option value="BUDDY">Buddy</option><option value="INDUCTION">Induction</option><option value="TRAINING">Training</option><option value="OTHER">Other</option></select>
        <input [(ngModel)]="newTask.title" placeholder="Task title" />
        <input [(ngModel)]="newTask.dueDate" type="date" />
        <button (click)="createTask()" [disabled]="!employeeId || !newTask.title">Add task</button>
      </div>
    </div>
  
    </e360-module-shell>
  `,
})
export class PreboardingAdminComponent implements OnInit {
  private api = inject(ApiService);
  tasks: any[] = []; employees: any[] = []; employeeId = ''; newTask: any = { taskType: 'DOCUMENT' }; error = '';
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
      employee: t.employee ? `${t.employee.user.firstName} ${t.employee.user.lastName} (${t.employee.employeeCode})` : '—',
      type: t.taskType,
      title: t.title,
      status: t.status,
    }));
  }

  async ngOnInit() {
    try { [this.tasks, this.employees] = await Promise.all([this.api.get<any[]>('/preboarding/tasks'), this.api.get<any[]>('/employees/directory')]); }
    catch (e) { this.error = errMsg(e); }
  }
  async complete(id: string) {
    try { await this.api.patch(`/preboarding/tasks/${id}/complete`); this.tasks = await this.api.get<any[]>('/preboarding/tasks'); }
    catch (e) { this.error = errMsg(e); }
  }
  async init() {
    try { await this.api.post(`/preboarding/tasks/init/${this.employeeId}`, {}); this.tasks = await this.api.get<any[]>('/preboarding/tasks'); }
    catch (e) { this.error = errMsg(e); }
  }
  async createTask() {
    try {
      await this.api.post('/preboarding/tasks', { ...this.newTask, employeeId: this.employeeId, dueDate: this.newTask.dueDate ? new Date(this.newTask.dueDate).toISOString() : undefined });
      this.newTask = { taskType: 'DOCUMENT' }; this.tasks = await this.api.get<any[]>('/preboarding/tasks');
    } catch (e) { this.error = errMsg(e); }
  }
  get employeeOptions(): SelectOption[] { return this.employees.map((employee) => ({ value: employee.id, label: `${employee.user.firstName} ${employee.user.lastName} (${employee.employeeCode})` })); }
}

import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';
import { HasRoleDirective } from '../core/has-role.directive';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    ExportBarComponent,
    HasRoleDirective,
    ModuleShellComponent,
    DataTableComponent,
    IconComponent,
  ],
  template: `
    <e360-module-shell
      title="Employees"
      description="Workforce directory with status tracking, departments, and join dates."
      icon="users-round"
      moduleKey="employees"
      auditEntityType="EMPLOYEE"
      rolesHint="View: HR, Manager · Write: HR, Tenant Admin"
      [breadcrumbs]="[{ label: 'Workforce' }, { label: 'Employees' }]"
    >
      <div actions>
        <export-bar [rows]="employees" [cols]="exportCols" name="employees" />
      </div>

      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div *hasRole="'TENANT_ADMIN','HR'" class="card">
        <h2>Add employee (direct hire)</h2>
        <div class="e360-form-grid">
          <div><label>First name</label><input [(ngModel)]="f.firstName" /></div>
          <div><label>Last name</label><input [(ngModel)]="f.lastName" /></div>
          <div><label>Email</label><input type="email" [(ngModel)]="f.email" /></div>
          <div><label>Designation</label><input [(ngModel)]="f.designation" /></div>
          <div><label>Join date</label><input type="date" [(ngModel)]="f.joinDate" /></div>
          <div>
            <label>Status filter</label>
            <select [(ngModel)]="statusFilter" (ngModelChange)="load()">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="ON_NOTICE">On notice</option>
              <option value="EXITED">Exited</option>
            </select>
          </div>
        </div>
        <button (click)="create()"><e360-icon name="plus" [size]="14" /> Add employee</button>
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Employee directory ({{ employees.length }})</h2>
          @if (statusFilter) {
            <span class="e360-badge warning">Filtered: {{ statusFilter }}</span>
          }
        </div>
        <e360-data-table [columns]="tableCols" [rows]="tableRows" [pageSize]="20" />
      </div>
    </e360-module-shell>
  `,
})
export class EmployeesComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  @Input() status?: string;
  employees: any[] = [];
  error = '';
  statusFilter = '';
  f: any = {};
  exportCols = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'user.firstName', label: 'First name' },
    { key: 'user.lastName', label: 'Last name' },
    { key: 'user.email', label: 'Email' },
    { key: 'designation', label: 'Designation' },
    { key: 'department.name', label: 'Department' },
    { key: 'joinDate', label: 'Joined' },
    { key: 'status', label: 'Status' },
  ];
  tableCols: TableColumn[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'designation', label: 'Designation', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'joined', label: 'Joined', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  get tableRows() {
    return this.employees.map((e) => ({
      code: e.employeeCode,
      name: `${e.user.firstName} ${e.user.lastName}`,
      email: e.user.email,
      designation: e.designation,
      department: e.department?.name ?? '—',
      joined: e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—',
      status: e.status,
    }));
  }

  async ngOnInit() {
    this.statusFilter = this.status ?? '';
    await this.load();
  }
  ngOnChanges() {
    this.statusFilter = this.status ?? '';
    this.load();
  }
  async load() {
    try {
      const q = this.statusFilter || this.status;
      this.employees = await this.api.get<any[]>(q ? `/employees?status=${q}` : '/employees');
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try {
      await this.api.post('/employees', {
        ...this.f,
        joinDate: this.f.joinDate ? new Date(this.f.joinDate).toISOString() : undefined,
      });
      this.f = {};
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}

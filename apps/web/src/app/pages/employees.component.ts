import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ExportBarComponent } from '../core/export-bar.component';
import { HasRoleDirective } from '../core/has-role.directive';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { IconComponent } from '../ui/icon.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    ExportBarComponent,
    HasRoleDirective,
    ModuleShellComponent,
    DataTableComponent,
    IconComponent,
    SelectFieldComponent,
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
          <e360-select-field
            label="Status filter"
            placeholder="All statuses"
            [multiple]="true"
            [options]="statusOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="page = 1; load()"
          />
        </div>
        <button (click)="create()"><e360-icon name="plus" [size]="14" /> Add employee</button>
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Employee directory ({{ total }})</h2>
          @if (statusFilter.length) {
            <span class="e360-badge warning">Filtered: {{ statusFilter.join(', ') }}</span>
          }
        </div>
        <e360-data-table
          [columns]="tableCols"
          [rows]="tableRows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
        />
      </div>
      <div *hasRole="'TENANT_ADMIN','HR'" class="card">
        <h2>Employment status actions</h2>
        <table><tr><th>Employee</th><th>Current status</th><th>Allowed action</th></tr>
          @for (e of employees; track e.id) {
            <tr><td>{{ e.user.firstName }} {{ e.user.lastName }}</td><td>{{ e.status }}</td><td>
              @if (e.status === 'ONBOARDING') { <button class="secondary" (click)="updateStatus(e.id, 'ACTIVE')">Activate</button> }
              @if (e.status === 'ACTIVE') { <button class="secondary" (click)="updateStatus(e.id, 'ON_NOTICE')">Mark on notice</button> }
              @if (e.status === 'ON_NOTICE') { <button class="secondary" (click)="updateStatus(e.id, 'ACTIVE')">Reactivate</button> }
              @if (e.status === 'EXITED') { <span class="muted">Managed by exit workflow</span> }
            </td></tr>
          }
        </table>
      </div>
    </e360-module-shell>
  `,
})
export class EmployeesComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  @Input() status?: string;
  employees: any[] = [];
  error = '';
  statusFilter: string[] = [];
  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXITED', label: 'Exited' },
    { value: 'ONBOARDING', label: 'Onboarding' },
    { value: 'ON_NOTICE', label: 'On notice' },
  ];
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
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
    this.statusFilter = this.status ? [this.status] : [];
    await this.load();
  }
  ngOnChanges() {
    this.statusFilter = this.status ? [this.status] : [];
    this.page = 1;
    this.load();
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const extra: Record<string, string | string[]> = {};
      if (this.statusFilter.length) extra.status = this.statusFilter;
      else if (this.status) extra.status = [this.status];
      const params = tableListParams(this.page, this.pageSize, extra, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/employees', params);
      const { items, meta } = unwrapPaginated(res);
      this.employees = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
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
  async updateStatus(id: string, status: string) {
    try { await this.api.patch(`/employees/${id}`, { status }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}

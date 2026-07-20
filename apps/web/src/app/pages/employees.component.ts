import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ExportBarComponent } from '../core/export-bar.component';
import { HasRoleDirective } from '../core/has-role.directive';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { IconComponent } from '../ui/icon.component';
import { GeoPickerComponent } from '../ui/geo-picker.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { LifecycleWizardComponent } from '../ui/lifecycle-wizard.component';

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
    LifecycleWizardComponent,
    GeoPickerComponent,
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
          <div><label>Initial password (optional)</label><input type="password" [(ngModel)]="f.password" autocomplete="new-password" /></div>
          <e360-select-field label="Designation" placeholder="Select designation" [options]="designationOptions" [(ngModel)]="f.designation" />
          <e360-select-field label="Department" placeholder="Select department" [options]="departmentOptions" [(ngModel)]="f.departmentId" />
          <e360-select-field label="Reporting manager" placeholder="Select manager" [options]="managerOptions" [(ngModel)]="f.managerId" />
          <e360-geo-picker [model]="f" (changed)="f.location = ''" />
          <div><label>Work location display (auto from selection)</label><input [(ngModel)]="f.location" placeholder="e.g. Pune, Maharashtra, India" /></div>
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
          [rowClickable]="true"
          [selectedId]="selectedEmployee?.id ?? null"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
          (rowClick)="onEmployeeClick($event)"
        />
      </div>
      @if (selectedEmployee) {
        <e360-lifecycle-wizard
          entityType="EMPLOYEE"
          [entityId]="selectedEmployee.id"
          workflowCode="EMPLOYEE_LIFECYCLE"
          [title]="selectedEmployee.user.firstName + ' ' + selectedEmployee.user.lastName + ' — employee lifecycle'"
          [metadata]="{ employeeCode: selectedEmployee.employeeCode, status: selectedEmployee.status, designation: selectedEmployee.designation }"
        />
      }
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
  departments: any[] = [];
  designations: any[] = [];
  managers: any[] = [];
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
  selectedEmployee: any = null;
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
      id: e.id,
      code: e.employeeCode,
      name: `${e.user.firstName} ${e.user.lastName}`,
      email: e.user.email,
      designation: e.designation,
      department: e.department?.name ?? '—',
      joined: e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—',
      status: e.status,
    }));
  }

  get departmentOptions(): SelectOption[] { return this.departments.map((department) => ({ value: department.id, label: department.name })); }
  get designationOptions(): SelectOption[] { return this.designations.map((designation) => ({ value: designation.name, label: designation.name })); }
  get managerOptions(): SelectOption[] { return this.managers.map((manager) => ({ value: manager.id, label: `${manager.user.firstName} ${manager.user.lastName} (${manager.employeeCode})` })); }

  async ngOnInit() {
    this.statusFilter = this.status ? [this.status] : [];
    await Promise.all([this.load(), this.loadReferences()]);
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
      if (this.selectedEmployee) this.selectedEmployee = items.find((item: any) => item.id === this.selectedEmployee.id) ?? null;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
  onEmployeeClick(row: Record<string, unknown>) {
    const id = String(row['id'] ?? '');
    this.selectedEmployee = this.selectedEmployee?.id === id ? null : this.employees.find((item) => item.id === id) ?? null;
  }
  async loadReferences() {
    try {
      [this.departments, this.designations, this.managers] = await Promise.all([
        this.api.get<any[]>('/departments'),
        this.api.get<any[]>('/designations'),
        this.api.get<any[]>('/employees/directory'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try {
      if (!this.f.firstName?.trim() || !this.f.lastName?.trim() || !this.f.email?.trim() || !this.f.designation) {
        this.error = 'First name, last name, email, and designation are required.'; return;
      }
      await this.api.post('/employees', {
        ...this.f,
        location: this.f.location || undefined,
        countryCode: this.f.countryCode || undefined,
        stateId: this.f.stateId || undefined,
        cityId: this.f.cityId || undefined,
        joinDate: this.f.joinDate ? new Date(this.f.joinDate).toISOString() : undefined,
      });
      this.f = {};
      await Promise.all([this.load(), this.loadReferences()]);
    } catch (e) { this.error = errMsg(e); }
  }
  async updateStatus(id: string, status: string) {
    try { await this.api.patch(`/employees/${id}`, { status }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Benefits"
      description="Benefit plans and employee enrollments."
      icon="heart-pulse"
      moduleKey="benefits"
      auditEntityType="BENEFIT_PLAN"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Compensation' }, { label: 'Benefits' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Plans</h2>
      @if (isAdmin) {
      <div class="row">
        <input [(ngModel)]="f.code" placeholder="Code" />
        <input [(ngModel)]="f.name" placeholder="Name" />
        <input [(ngModel)]="f.category" placeholder="Category" />
        <button (click)="create()">Add plan</button>
      </div>
      }
      <e360-data-table [columns]="planCols" [rows]="planRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.code }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.category }}</td>
          <td>{{ row.enrolled }}</td>
          <td>@if (isAdmin) {
            <e360-select-field
              placeholder="Select employee"
              [compact]="true"
              [options]="employeeOptions"
              [(ngModel)]="row._raw._employeeId"
            />
            <button (click)="enroll(row._raw)" [disabled]="!row._raw._employeeId">Enroll</button>
          }</td>
        </ng-template>
      </e360-data-table>
    </div>
    @if (isAdmin) {
      <div class="card"><h2>All enrollments</h2>
        <e360-data-table [columns]="enrollCols" [rows]="enrollRows" [paginated]="false" [stickyHeader]="true" />
      </div>
    }
    <div class="card"><h2>My enrollments</h2>
      <ul>@for (e of mine; track e.id) { <li>{{ e.plan.name }} ({{ e.status }})</li> }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class BenefitsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  plans: any[] = []; mine: any[] = []; employees: any[] = []; enrollments: any[] = [];
  f: any = {}; error = '';
  planCols: TableColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'enrolled', label: 'Enrolled' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];
  enrollCols: TableColumn[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Status' },
  ];

  get isAdmin() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

  get employeeOptions(): SelectOption[] {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.user.firstName} ${e.user.lastName}`,
    }));
  }

  get planRows() {
    return this.plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      enrolled: p._count?.enrollments ?? 0,
      _raw: p,
    }));
  }

  get enrollRows() {
    return this.enrollments.map((e) => ({
      employee: `${e.employee.user.firstName} ${e.employee.user.lastName}`,
      plan: e.plan.name,
      status: e.status,
    }));
  }

  async ngOnInit() {
    try {
      [this.plans, this.mine] = await Promise.all([
        this.api.get<any[]>('/benefits/plans'),
        this.api.get<any[]>('/benefits/enrollments/mine'),
      ]);
      if (this.isAdmin) {
        [this.employees, this.enrollments] = await Promise.all([
          this.api.get<any[]>('/employees'),
          this.api.get<any[]>('/benefits/enrollments'),
        ]);
      }
    } catch (e) { this.error = errMsg(e); }
  }

  async create() {
    try {
      await this.api.post('/benefits/plans', this.f);
      this.plans = await this.api.get<any[]>('/benefits/plans');
      this.f = {};
    } catch (e) { this.error = errMsg(e); }
  }

  async enroll(plan: any) {
    try {
      await this.api.post(`/benefits/plans/${plan.id}/enroll`, { employeeId: plan._employeeId });
      [this.plans, this.enrollments, this.mine] = await Promise.all([
        this.api.get<any[]>('/benefits/plans'),
        this.api.get<any[]>('/benefits/enrollments'),
        this.api.get<any[]>('/benefits/enrollments/mine'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
}

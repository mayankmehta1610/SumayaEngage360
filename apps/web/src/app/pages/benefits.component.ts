import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
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
      <table><tr><th>Code</th><th>Name</th><th>Category</th><th>Enrolled</th><th></th></tr>
        @for (p of plans; track p.id) {
          <tr><td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ p.category }}</td><td>{{ p._count?.enrollments }}</td>
            <td>@if (isAdmin) {
              <select [(ngModel)]="p._employeeId">
                <option [ngValue]="undefined">Select employee</option>
                @for (e of employees; track e.id) {
                  <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option>
                }
              </select>
              <button (click)="enroll(p)" [disabled]="!p._employeeId">Enroll</button>
            }</td>
          </tr>
        }</table>
    </div>
    @if (isAdmin) {
      <div class="card"><h2>All enrollments</h2>
        <table><tr><th>Employee</th><th>Plan</th><th>Status</th></tr>
          @for (e of enrollments; track e.id) {
            <tr><td>{{ e.employee.user.firstName }} {{ e.employee.user.lastName }}</td><td>{{ e.plan.name }}</td><td>{{ e.status }}</td></tr>
          } @empty { <tr><td colspan="3" class="muted">No enrollments yet.</td></tr> }
        </table>
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

  get isAdmin() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

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

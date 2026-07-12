import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Goals & KPIs"
      description="KPI library and personal goal tracking."
      icon="target"
      moduleKey="goals"
      auditEntityType="GOAL"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Performance' }, { label: 'Goals' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>KPI library</h2>
      @if (isHr) {
      <input [(ngModel)]="kpiCode" placeholder="Code" /> <input [(ngModel)]="kpiName" placeholder="Name" />
      <button (click)="addKpi()">Add KPI</button>
      }
      <ul>@for (k of kpis; track k.id) { <li>{{ k.code }} — {{ k.name }}</li> }</ul>
    </div>
    @if (canAssign) {
      <div class="card">
        <h2>Assign goal</h2>
        <div class="row">
          <e360-select-field
            placeholder="Select employee"
            [options]="employeeOptions"
            [(ngModel)]="assignment.employeeId"
          />
          <input [(ngModel)]="assignment.title" placeholder="Goal title" />
          <input [(ngModel)]="assignment.target" placeholder="Target" />
          <input type="date" [(ngModel)]="assignment.dueDate" />
          <button (click)="assignGoal()" [disabled]="!assignment.employeeId || !assignment.title">Assign</button>
        </div>
        <e360-data-table [columns]="teamGoalCols" [rows]="teamGoalRows" [paginated]="false" [stickyHeader]="true" />
      </div>
    }
    <div class="card">
      <h2>My goals</h2>
      <ul>@for (g of goals; track g.id) {
        <li>{{ g.title }} — {{ g.progress }}% <button (click)="bump(g.id, g.progress)">+10%</button></li>
      }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class GoalsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  kpis: any[] = []; goals: any[] = []; employees: any[] = []; teamGoals: any[] = [];
  assignment: any = {}; kpiCode = ''; kpiName = ''; error = '';
  teamGoalCols: TableColumn[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'goal', label: 'Goal' },
    { key: 'target', label: 'Target' },
    { key: 'progress', label: 'Progress' },
  ];

  get teamGoalRows() {
    return this.teamGoals.map((g) => ({
      employee: `${g.employee.user.firstName} ${g.employee.user.lastName}`,
      goal: g.title,
      target: g.target,
      progress: `${g.progress}%`,
    }));
  }

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get canAssign() { return this.auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER'); }

  get employeeOptions(): SelectOption[] {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.user.firstName} ${e.user.lastName}`,
    }));
  }

  async ngOnInit() {
    try {
      [this.kpis, this.goals] = await Promise.all([
        this.api.get<any[]>('/goals/kpis'),
        this.api.get<any[]>('/goals/mine'),
      ]);
      if (this.canAssign) {
        [this.employees, this.teamGoals] = await Promise.all([
          this.api.get<any[]>(this.isHr ? '/employees/directory' : '/employees/team'),
          this.api.get<any[]>('/goals'),
        ]);
      }
    } catch (e) { this.error = errMsg(e); }
  }
  async addKpi() {
    await this.api.post('/goals/kpis', { code: this.kpiCode, name: this.kpiName });
    this.kpis = await this.api.get<any[]>('/goals/kpis');
    this.kpiCode = ''; this.kpiName = '';
  }
  async bump(id: string, p: number) {
    await this.api.patch(`/goals/${id}/progress`, { progress: p + 10 });
    this.goals = await this.api.get<any[]>('/goals/mine');
  }
  async assignGoal() {
    try {
      await this.api.post('/goals', {
        ...this.assignment,
        dueDate: this.assignment.dueDate
          ? new Date(this.assignment.dueDate).toISOString()
          : undefined,
      });
      this.assignment = {};
      this.teamGoals = await this.api.get<any[]>('/goals');
    } catch (e) { this.error = errMsg(e); }
  }
}

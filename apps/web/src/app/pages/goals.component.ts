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
          <select [(ngModel)]="assignment.employeeId">
            <option [ngValue]="undefined">Select employee</option>
            @for (e of employees; track e.id) {
              <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option>
            }
          </select>
          <input [(ngModel)]="assignment.title" placeholder="Goal title" />
          <input [(ngModel)]="assignment.target" placeholder="Target" />
          <input type="date" [(ngModel)]="assignment.dueDate" />
          <button (click)="assignGoal()" [disabled]="!assignment.employeeId || !assignment.title">Assign</button>
        </div>
        <table><tr><th>Employee</th><th>Goal</th><th>Target</th><th>Progress</th></tr>
          @for (g of teamGoals; track g.id) {
            <tr><td>{{ g.employee.user.firstName }} {{ g.employee.user.lastName }}</td><td>{{ g.title }}</td><td>{{ g.target }}</td><td>{{ g.progress }}%</td></tr>
          } @empty { <tr><td colspan="4" class="muted">No team goals assigned.</td></tr> }
        </table>
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

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get canAssign() { return this.auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER'); }

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

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
      <input [(ngModel)]="kpiCode" placeholder="Code" /> <input [(ngModel)]="kpiName" placeholder="Name" /> <input [(ngModel)]="kpiUnit" placeholder="Unit (%, USD, count)" />
      <button (click)="addKpi()">Add KPI</button>
      }
      <ul>@for (k of kpis; track k.id) { <li>{{ k.code }} — {{ k.name }}{{ k.unit ? ' (' + k.unit + ')' : '' }}</li> }</ul>
    </div>
    <div class="card">
      <h2>Competency library</h2>
      @if (isHr) { <input [(ngModel)]="competency.code" placeholder="Code" /> <input [(ngModel)]="competency.name" placeholder="Name" /> <input [(ngModel)]="competency.level" type="number" min="1" placeholder="Level" /> <button (click)="addCompetency()">Add competency</button> }
      <ul>@for (c of competencies; track c.id) { <li>{{ c.code }} — {{ c.name }} (level {{ c.level }})</li> }</ul>
    </div>
    <div class="card">
      <h2>Goal template library</h2>
      @if (isHr) { <input [(ngModel)]="template.title" placeholder="Reusable goal title" /> <input [(ngModel)]="template.category" placeholder="Category" /> <button (click)="addTemplate()">Add template</button> }
      <ul>@for (t of templates; track t.id) { <li>{{ t.title }}{{ t.category ? ' · ' + t.category : '' }}</li> }</ul>
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
          <input [(ngModel)]="assignment.cycleId" placeholder="Performance cycle" />
          <input type="date" [(ngModel)]="assignment.dueDate" />
          <button (click)="assignGoal()" [disabled]="!assignment.employeeId || !assignment.title">Assign</button>
        </div>
        <e360-data-table [columns]="teamGoalCols" [rows]="teamGoalRows" [pageSize]="15" [stickyHeader]="true" />
      </div>
    }
    <div class="card">
      <h2>My goals</h2>
      <ul>@for (g of goals; track g.id) {
        <li>{{ g.title }} — {{ g.target || 'No target' }} — due {{ g.dueDate ? g.dueDate.slice(0, 10) : 'not set' }} — {{ g.progress }}%
          <input type="number" min="0" max="100" [(ngModel)]="g._progress" style="width:80px" /> <button (click)="setProgress(g.id, g._progress ?? g.progress)">Update</button></li>
      }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class GoalsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  kpis: any[] = []; competencies: any[] = []; templates: any[] = []; goals: any[] = []; employees: any[] = []; teamGoals: any[] = [];
  assignment: any = {}; competency: any = { level: 1 }; template: any = {}; kpiCode = ''; kpiName = ''; kpiUnit = ''; error = '';
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
      [this.kpis, this.competencies, this.templates, this.goals] = await Promise.all([
        this.api.get<any[]>('/goals/kpis'),
        this.api.get<any[]>('/goals/competencies'),
        this.api.get<any[]>('/goals/library'),
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
    try {
      if (!this.kpiCode.trim() || !this.kpiName.trim()) { this.error = 'KPI code and name are required.'; return; }
      await this.api.post('/goals/kpis', { code: this.kpiCode.trim(), name: this.kpiName.trim(), unit: this.kpiUnit.trim() || undefined });
      this.kpis = await this.api.get<any[]>('/goals/kpis'); this.kpiCode = ''; this.kpiName = ''; this.kpiUnit = '';
    } catch (e) { this.error = errMsg(e); }
  }
  async addCompetency() {
    try {
      if (!this.competency.code?.trim() || !this.competency.name?.trim()) { this.error = 'Competency code and name are required.'; return; }
      await this.api.post('/goals/competencies', { ...this.competency, level: Number(this.competency.level || 1) });
      this.competencies = await this.api.get<any[]>('/goals/competencies'); this.competency = { level: 1 };
    } catch (e) { this.error = errMsg(e); }
  }
  async addTemplate() {
    try {
      if (!this.template.title?.trim()) { this.error = 'Template title is required.'; return; }
      await this.api.post('/goals/library', this.template); this.templates = await this.api.get<any[]>('/goals/library'); this.template = {};
    } catch (e) { this.error = errMsg(e); }
  }
  async setProgress(id: string, progress: number) {
    try { await this.api.patch(`/goals/${id}/progress`, { progress: Number(progress) }); this.goals = await this.api.get<any[]>('/goals/mine'); }
    catch (e) { this.error = errMsg(e); }
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

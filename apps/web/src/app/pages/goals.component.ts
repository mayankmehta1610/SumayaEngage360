import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

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
      <input [(ngModel)]="kpiCode" placeholder="Code" /> <input [(ngModel)]="kpiName" placeholder="Name" />
      <button (click)="addKpi()">Add KPI</button>
      <ul>@for (k of kpis; track k.id) { <li>{{ k.code }} — {{ k.name }}</li> }</ul>
    </div>
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
  kpis: any[] = []; goals: any[] = []; kpiCode = ''; kpiName = ''; error = '';

  async ngOnInit() {
    try {
      [this.kpis, this.goals] = await Promise.all([
        this.api.get<any[]>('/goals/kpis'),
        this.api.get<any[]>('/goals/mine'),
      ]);
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
}

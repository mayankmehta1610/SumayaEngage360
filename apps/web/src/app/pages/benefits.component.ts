import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

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
      <div class="row">
        <input [(ngModel)]="f.code" placeholder="Code" />
        <input [(ngModel)]="f.name" placeholder="Name" />
        <input [(ngModel)]="f.category" placeholder="Category" />
        <button (click)="create()">Add plan</button>
      </div>
      <table><tr><th>Code</th><th>Name</th><th>Category</th><th>Enrolled</th></tr>
        @for (p of plans; track p.id) {
          <tr><td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ p.category }}</td><td>{{ p._count?.enrollments }}</td></tr>
        }</table>
    </div>
    <div class="card"><h2>My enrollments</h2>
      <ul>@for (e of mine; track e.id) { <li>{{ e.plan.name }} ({{ e.status }})</li> }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class BenefitsComponent implements OnInit {
  private api = inject(ApiService);
  plans: any[] = []; mine: any[] = []; f: any = {}; error = '';

  async ngOnInit() {
    try {
      [this.plans, this.mine] = await Promise.all([
        this.api.get<any[]>('/benefits/plans'),
        this.api.get<any[]>('/benefits/enrollments/mine'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }

  async create() {
    await this.api.post('/benefits/plans', this.f);
    this.plans = await this.api.get<any[]>('/benefits/plans');
    this.f = {};
  }
}

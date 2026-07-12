import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { AuthService } from '../core/auth.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Projects & allocation"
      description="Project catalogue and employee allocations."
      icon="folder-kanban"
      moduleKey="projects"
      auditEntityType="PROJECT"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Projects' }]"
    >
      <div actions><export-bar [rows]="projects" [cols]="exportCols" name="projects" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }
    @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
    <div class="card">
      <h2>Create project</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="f.name" /></div>
        <div><label>Code</label><input [(ngModel)]="f.code" placeholder="PRJ-001" /></div>
        <e360-select-field
          label="Client (empty = internal)"
          placeholder="— internal —"
          [options]="clientOptions"
          [(ngModel)]="f.hiringClientId"
        />
        <div><label>Deployment location</label><input [(ngModel)]="f.location" /></div>
        <e360-select-field
          label="Project manager"
          placeholder="choose…"
          [options]="employeeOptions"
          [(ngModel)]="f.managerId"
        />
      </div>
      <button (click)="create()">Create project</button>
    </div>
    }

    @for (p of projects; track p.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <strong>{{ p.name }} <span class="muted">({{ p.code }})</span></strong>
          <span class="badge">{{ p.client?.name ?? 'internal' }}</span>
        </div>
        <div class="row" style="align-items:flex-end">
            <e360-select-field
              label="Allocate employee"
              placeholder="choose…"
              [options]="employeeOptions"
              [(ngModel)]="p._emp"
            />
          <div><label>%</label><input type="number" [(ngModel)]="p._pct" min="1" max="100" /></div>
          <div><label>From</label><input type="date" [(ngModel)]="p._from" /></div>
          <div style="flex:0"><button class="secondary" (click)="allocate(p)">Allocate</button></div>
        </div>
        <p class="muted">Allocating sets the project manager as the employee's reporting manager (first allocation).</p>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class ProjectsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  projects: any[] = [];
  clients: any[] = [];
  employees: any[] = [];
  error = '';
  f: any = {};
  exportCols = [
    { key: 'name', label: 'Project' },
    { key: 'code', label: 'Code' },
    { key: 'client.name', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: '_count.allocations', label: 'Allocations' },
  ];

  get clientOptions(): SelectOption[] {
    return this.clients.map((c) => ({ value: c.id, label: c.name }));
  }

  get employeeOptions(): SelectOption[] {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.user.firstName} ${e.user.lastName}`,
    }));
  }

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.projects, this.employees] = await Promise.all([
        this.api.get<any[]>('/projects'),
        this.api.get<any[]>('/employees'),
      ]);
      try { this.clients = await this.api.get<any[]>('/hiring-clients'); } catch {}
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try { await this.api.post('/projects', {
      ...this.f,
      hiringClientId: this.f.hiringClientId || undefined,
      managerId: this.f.managerId || undefined,
    }); this.f = {}; await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async allocate(p: any) {
    try {
      await this.api.post(`/projects/${p.id}/allocations`, {
        employeeId: p._emp,
        percentage: Number(p._pct ?? 100),
        startDate: new Date(p._from ?? Date.now()).toISOString(),
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Requirements hub"
      description="Sheets 01–04 — feature catalogue, modules, roles & workflows"
      icon="clipboard-list"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR, PLATFORM_ADMIN"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Requirements' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    @if (overview) {
      <div class="card stats">
        <div><strong>{{ overview.sheets['01_Feature_Catalogue'].total }}</strong><span>features</span></div>
        <div><strong>{{ overview.sheets['01_Feature_Catalogue'].done }}</strong><span>done</span></div>
        <div><strong>{{ overview.sheets['02_Module_Summary'].domains }}</strong><span>domains</span></div>
        <div><strong>{{ overview.sheets['03_Roles'].roles }}</strong><span>roles</span></div>
        <div><strong>{{ overview.sheets['04_Workflows'].implemented }}/{{ overview.sheets['04_Workflows'].total }}</strong><span>workflows live</span></div>
      </div>
    }

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Module summary</h2>
        <export-bar [rows]="modules" [cols]="modCols" name="module-summary" />
      </div>
      <e360-data-table [columns]="moduleCols" [rows]="moduleRows" [pageSize]="15" [stickyHeader]="true" />
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Roles ({{ roles.length }})</h2>
        <export-bar [rows]="roles" [cols]="roleCols" name="roles" />
      </div>
      <e360-data-table [columns]="roleTableCols" [rows]="roleRows" [pageSize]="15" [stickyHeader]="true" />
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Workflows</h2>
        <export-bar [rows]="workflows" [cols]="wfCols" name="workflows" />
      </div>
      <e360-data-table [columns]="wfCols2" [rows]="wfRows" [pageSize]="15" [stickyHeader]="true" />
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Feature catalogue (page {{ featMeta.page }}/{{ featMeta.totalPages }})</h2>
        <div>
          <e360-select-field
            placeholder="All statuses"
            [options]="featureStatusOptions"
            [(ngModel)]="featureStatusFilter"
            (ngModelChange)="loadFeatures(1, $event)"
          />
          <export-bar [rows]="features" [cols]="featCols" name="features" />
        </div>
      </div>
      <e360-data-table
        [columns]="featTableCols"
        [rows]="featRows"
        [page]="featMeta.page"
        [pageSize]="30"
        [total]="featMeta.total"
        [paginated]="true"
        [stickyHeader]="true"
        (pageChange)="loadFeatures($event, featureStatusFilter)"
      />
    </div>
  
    </e360-module-shell>
  `,
  styles: [`
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .stats div { display: flex; flex-direction: column; align-items: center; min-width: 80px; }
    .stats strong { font-size: 1.4rem; }
    .stats span { font-size: .75rem; color: var(--e360-text-muted); }
    .pager { margin-top: .75rem; display: flex; gap: .5rem; }
  `],
})
export class RequirementsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  overview: any;
  modules: any[] = [];
  roles: any[] = [];
  workflows: any[] = [];
  features: any[] = [];
  featMeta = { page: 1, totalPages: 1, total: 0 };
  featureStatusFilter = '';
  featureStatusOptions: SelectOption[] = [
    { value: 'Done', label: 'Done' },
    { value: 'Not Started', label: 'Not Started' },
  ];
  error = '';
  modCols = [{ key: 'domain', label: 'Domain' }, { key: 'featureRows', label: 'Features' }, { key: 'phase', label: 'Phase' }];
  roleCols = [{ key: 'role', label: 'Role' }, { key: 'scope', label: 'Scope' }, { key: 'systemRole', label: 'System' }];
  wfCols = [{ key: 'name', label: 'Name' }, { key: 'implemented', label: 'Live' }];
  featCols = [{ key: 'id', label: 'ID' }, { key: 'domain', label: 'Domain' }, { key: 'featureName', label: 'Feature' }, { key: 'status', label: 'Status' }];
  moduleCols: TableColumn[] = [
    { key: 'domain', label: 'Domain' },
    { key: 'submodules', label: 'Submodules' },
    { key: 'features', label: 'Features' },
    { key: 'must', label: 'Must' },
    { key: 'should', label: 'Should' },
    { key: 'points', label: 'Points' },
    { key: 'phase', label: 'Phase' },
  ];
  roleTableCols: TableColumn[] = [
    { key: 'role', label: 'Role' },
    { key: 'persona', label: 'Persona' },
    { key: 'scope', label: 'Scope' },
    { key: 'systemRole', label: 'System role' },
    { key: 'capabilities', label: 'Capabilities' },
  ];
  wfCols2: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'trigger', label: 'Trigger' },
    { key: 'stages', label: 'Stages' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'live', label: 'Live' },
  ];
  featTableCols: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'domain', label: 'Domain' },
    { key: 'module', label: 'Module' },
    { key: 'feature', label: 'Feature' },
    { key: 'status', label: 'Status' },
  ];

  get moduleRows() {
    return this.modules.map((m) => ({
      domain: m.domain,
      submodules: m.submodules,
      features: m.featureRows,
      must: m.mustCount,
      should: m.shouldCount,
      points: m.storyPoints,
      phase: m.phase,
    }));
  }

  get roleRows() {
    return this.roles.map((r) => ({
      role: r.role,
      persona: r.persona,
      scope: r.scope,
      systemRole: r.systemRole ?? '—',
      capabilities: r.capabilities,
    }));
  }

  get wfRows() {
    return this.workflows.map((w) => ({
      name: w.name,
      trigger: w.trigger,
      stages: w.stages,
      outcome: w.outcome,
      live: w.implemented ? 'yes' : 'planned',
    }));
  }

  get featRows() {
    return this.features.map((f) => ({
      id: f.id,
      domain: f.domain,
      module: f.module,
      feature: f.featureName,
      status: f.status,
    }));
  }

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR', 'PLATFORM_ADMIN')) return;
    try {
      const [ov, mods, roles, wfs] = await Promise.all([
        this.api.get<any>('/requirements/overview'),
        this.api.get<any[]>('/requirements/modules'),
        this.api.get<any[]>('/requirements/roles'),
        this.api.get<any[]>('/requirements/workflows'),
      ]);
      this.overview = ov;
      this.modules = mods;
      this.roles = roles;
      this.workflows = wfs;
      await this.loadFeatures(1);
    } catch (e) { this.error = errMsg(e); }
  }

  async loadFeatures(page = 1, status = '') {
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '30' };
      if (status) params.status = status;
      const res = await this.api.get<any>('/requirements/features', params);
      this.features = res.data;
      this.featMeta = { ...res.meta, total: res.meta?.total ?? res.data?.length ?? 0 };
    } catch (e) { this.error = errMsg(e); }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [ExportBarComponent, ModuleShellComponent],
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
      <table>
        <tr><th>Domain</th><th>Submodules</th><th>Features</th><th>Must</th><th>Should</th><th>Points</th><th>Phase</th></tr>
        @for (m of modules; track m.id) {
          <tr>
            <td>{{ m.domain }}</td><td>{{ m.submodules }}</td><td>{{ m.featureRows }}</td>
            <td>{{ m.mustCount }}</td><td>{{ m.shouldCount }}</td><td>{{ m.storyPoints }}</td><td>{{ m.phase }}</td>
          </tr>
        }
      </table>
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Roles ({{ roles.length }})</h2>
        <export-bar [rows]="roles" [cols]="roleCols" name="roles" />
      </div>
      <table>
        <tr><th>Role</th><th>Persona</th><th>Scope</th><th>System role</th><th>Capabilities</th></tr>
        @for (r of roles; track r.id) {
          <tr>
            <td>{{ r.role }}</td><td>{{ r.persona }}</td><td>{{ r.scope }}</td>
            <td>{{ r.systemRole ?? '—' }}</td><td class="muted" style="font-size:.78rem">{{ r.capabilities }}</td>
          </tr>
        }
      </table>
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Workflows</h2>
        <export-bar [rows]="workflows" [cols]="wfCols" name="workflows" />
      </div>
      <table>
        <tr><th>Name</th><th>Trigger</th><th>Stages</th><th>Outcome</th><th>Live</th></tr>
        @for (w of workflows; track w.id) {
          <tr>
            <td>{{ w.name }}</td><td>{{ w.trigger }}</td>
            <td class="muted" style="font-size:.78rem">{{ w.stages }}</td>
            <td>{{ w.outcome }}</td>
            <td><span class="badge" [class.ok]="w.implemented">{{ w.implemented ? 'yes' : 'planned' }}</span></td>
          </tr>
        }
      </table>
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Feature catalogue (page {{ featMeta.page }}/{{ featMeta.totalPages }})</h2>
        <div>
          <select (change)="loadFeatures(1, $any($event.target).value)">
            <option value="">All statuses</option>
            <option value="Done">Done</option>
            <option value="Not Started">Not Started</option>
          </select>
          <export-bar [rows]="features" [cols]="featCols" name="features" />
        </div>
      </div>
      <table>
        <tr><th>ID</th><th>Domain</th><th>Module</th><th>Feature</th><th>Status</th></tr>
        @for (f of features; track f.id) {
          <tr>
            <td>{{ f.id }}</td><td>{{ f.domain }}</td><td>{{ f.module }}</td>
            <td>{{ f.featureName }}</td>
            <td><span class="badge" [class.ok]="f.status === 'Done'">{{ f.status }}</span></td>
          </tr>
        }
      </table>
      <div class="pager">
        <button [disabled]="featMeta.page <= 1" (click)="loadFeatures(featMeta.page - 1)">Prev</button>
        <button [disabled]="featMeta.page >= featMeta.totalPages" (click)="loadFeatures(featMeta.page + 1)">Next</button>
      </div>
    </div>
  
    </e360-module-shell>
  `,
  styles: [`
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .stats div { display: flex; flex-direction: column; align-items: center; min-width: 80px; }
    .stats strong { font-size: 1.4rem; }
    .stats span { font-size: .75rem; color: #64748b; }
    .pager { margin-top: .75rem; display: flex; gap: .5rem; }
    select { margin-right: .5rem; }
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
  featMeta = { page: 1, totalPages: 1 };
  error = '';
  modCols = [{ key: 'domain', label: 'Domain' }, { key: 'featureRows', label: 'Features' }, { key: 'phase', label: 'Phase' }];
  roleCols = [{ key: 'role', label: 'Role' }, { key: 'scope', label: 'Scope' }, { key: 'systemRole', label: 'System' }];
  wfCols = [{ key: 'name', label: 'Name' }, { key: 'implemented', label: 'Live' }];
  featCols = [{ key: 'id', label: 'ID' }, { key: 'domain', label: 'Domain' }, { key: 'featureName', label: 'Feature' }, { key: 'status', label: 'Status' }];

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
      this.featMeta = res.meta;
    } catch (e) { this.error = errMsg(e); }
  }
}

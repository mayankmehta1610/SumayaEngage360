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
      title="Data & API catalogues"
      description="Sheets 06–07 — entity and API registry from database"
      icon="book-open"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Catalogues' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Data entities ({{ entityMeta.total }} total, {{ entityImpl }} implemented)</h2>
        <export-bar [rows]="entities" [cols]="entCols" name="data-entities" />
      </div>
      <table>
        <tr><th>Domain</th><th>Entity</th><th>PII</th><th>Prisma table</th><th>Status</th></tr>
        @for (e of entities; track e.id) {
          <tr>
            <td>{{ e.domain }}</td>
            <td>{{ e.entity }}</td>
            <td>{{ e.pii }}</td>
            <td>{{ e.prismaModel ?? '—' }}</td>
            <td><span class="badge" [class.ok]="e.implemented">{{ e.implemented ? 'implemented' : 'planned' }}</span></td>
          </tr>
        }
      </table>
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">API catalogue ({{ apiMeta.total }} total, {{ apiImpl }} implemented)</h2>
        <export-bar [rows]="apis" [cols]="apiCols" name="api-catalogue" />
      </div>
      <table>
        <tr><th>ID</th><th>Resource</th><th>Endpoint</th><th>Actual path</th><th>Status</th></tr>
        @for (a of apis; track a.id) {
          <tr>
            <td>{{ a.id }}</td>
            <td>{{ a.resource }}</td>
            <td class="muted" style="font-size:.78rem">{{ a.endpoint }}</td>
            <td>{{ a.actualPath ?? '—' }}</td>
            <td><span class="badge" [class.ok]="a.implemented">{{ a.implemented ? 'live' : 'planned' }}</span></td>
          </tr>
        }
      </table>
    </div>
  
    </e360-module-shell>
  `,
})
export class CataloguesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  entities: any[] = [];
  apis: any[] = [];
  entityMeta = { total: 0 };
  apiMeta = { total: 0 };
  entityImpl = 0;
  apiImpl = 0;
  error = '';
  entCols = [
    { key: 'domain', label: 'Domain' },
    { key: 'entity', label: 'Entity' },
    { key: 'prismaModel', label: 'Table' },
    { key: 'implemented', label: 'Implemented' },
  ];
  apiCols = [
    { key: 'id', label: 'ID' },
    { key: 'resource', label: 'Resource' },
    { key: 'actualPath', label: 'Path' },
    { key: 'implemented', label: 'Implemented' },
  ];

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    try {
      const [ent, api] = await Promise.all([
        this.api.get<any>('/v1/data-entities?pageSize=200'),
        this.api.get<any>('/v1/api-catalogue?pageSize=200'),
      ]);
      this.entities = ent.data ?? ent;
      this.apis = api.data ?? api;
      this.entityMeta = ent.meta ?? { total: this.entities.length };
      this.apiMeta = api.meta ?? { total: this.apis.length };
      this.entityImpl = this.entities.filter((e) => e.implemented).length;
      this.apiImpl = this.apis.filter((a) => a.implemented).length;
    } catch (e) { this.error = errMsg(e); }
  }
}

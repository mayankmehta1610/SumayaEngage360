import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [ExportBarComponent, ModuleShellComponent, DataTableComponent],
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
      <e360-data-table [columns]="entityCols" [rows]="entityRows" [paginated]="false" [stickyHeader]="true" />
    </div>

    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">API catalogue ({{ apiMeta.total }} total, {{ apiImpl }} implemented)</h2>
        <export-bar [rows]="apis" [cols]="apiCols" name="api-catalogue" />
      </div>
      <e360-data-table [columns]="apiTableCols" [rows]="apiRows" [paginated]="false" [stickyHeader]="true" />
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
  entityCols: TableColumn[] = [
    { key: 'domain', label: 'Domain' },
    { key: 'entity', label: 'Entity' },
    { key: 'pii', label: 'PII' },
    { key: 'table', label: 'Prisma table' },
    { key: 'status', label: 'Status' },
  ];
  apiTableCols: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'resource', label: 'Resource' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'path', label: 'Actual path' },
    { key: 'status', label: 'Status' },
  ];

  get entityRows() {
    return this.entities.map((e) => ({
      domain: e.domain,
      entity: e.entity,
      pii: e.pii,
      table: e.prismaModel ?? '—',
      status: e.implemented ? 'implemented' : 'planned',
    }));
  }

  get apiRows() {
    return this.apis.map((a) => ({
      id: a.id,
      resource: a.resource,
      endpoint: a.endpoint,
      path: a.actualPath ?? '—',
      status: a.implemented ? 'live' : 'planned',
    }));
  }

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

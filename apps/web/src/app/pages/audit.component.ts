import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [ExportBarComponent, ModuleShellComponent, DataTableComponent, FormsModule],
  template: `
    <e360-module-shell
      title="Audit log"
      description="Sheet 05 — NFR audit trail from database"
      icon="shield-check"
      moduleKey="audit"
      auditEntityType="AUDIT_LOG"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Audit trail' }]"
    >
      <div actions><export-bar [rows]="rows" [cols]="cols" name="audit-log" /></div>
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Audit entries ({{ total }})</h2>
        </div>
        <e360-data-table
          [columns]="tableCols"
          [rows]="tableRows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
        />
      </div>
    </e360-module-shell>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  rows: any[] = [];
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  cols = [
    { key: 'createdAt', label: 'When' },
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity' },
  ];
  tableCols: TableColumn[] = [
    { key: 'when', label: 'When', sortable: true },
    { key: 'actor', label: 'Actor', sortable: true },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'entity', label: 'Entity', sortable: true },
    { key: 'device', label: 'Device', sortable: false },
    { key: 'source', label: 'Source IP', sortable: false, filterable: false },
    { key: 'details', label: 'Details' },
  ];

  get tableRows() {
    return this.rows.map((r) => ({
      when: r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
      actor: r.actorEmail ?? r.actorId ?? '—',
      action: r.action,
      entity: `${r.entityType}${r.entityId ? ' #' + String(r.entityId).slice(0, 8) : ''}`,
      device: r.deviceType ?? '—',
      source: r.ipAddress ?? '—',
      details: r.details ? JSON.stringify(r.details) : (r.metadata ? JSON.stringify(r.metadata) : '—'),
    }));
  }

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    await this.load();
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const params = tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/audit', params);
      const { items, meta } = unwrapPaginated(res);
      this.rows = items;
      this.total = meta?.total ?? items.length;
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
}

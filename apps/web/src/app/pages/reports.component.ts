import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent } from '../ui/data-table.component';

interface ReportDef {
  id: string;
  code: string;
  name: string;
  audience: string;
  filters: string;
  priority: string;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, JsonPipe, ExportBarComponent, ModuleShellComponent, DataTableComponent],
  styles: [`
    .grid { display: grid; grid-template-columns: 280px 1fr; gap: 1rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .list button {
      display: block; width: 100%; text-align: left; margin: .25rem 0;
      padding: .55rem .7rem; border: 1px solid var(--e360-border); border-radius: 8px;
      background: var(--e360-surface); color: var(--e360-text); cursor: pointer;
      font-weight: 500;
    }
    .list button:hover:not(.sel) { background: var(--surface-2); border-color: var(--e360-border-strong); }
    .list button.sel { border-color: var(--e360-primary); background: var(--e360-primary-soft); color: var(--e360-text); }
    .kpis { display: flex; flex-wrap: wrap; gap: .6rem; margin: .75rem 0; }
    .kpi { border: 1px solid var(--e360-border); border-radius: 8px; padding: .6rem .9rem; min-width: 120px; background: var(--e360-surface); }
    .kpi .n { font-size: 1.4rem; font-weight: 700; color: var(--e360-text); }
    .kpi .l { font-size: .75rem; color: var(--e360-text-muted); }
    pre { background: var(--surface-2); color: var(--e360-text); padding: .75rem; border-radius: 8px; overflow: auto; max-height: 320px; font-size: .78rem; }
  `],
  template: `
    <e360-module-shell
      title="Reports & KPIs"
      description="Database-driven catalogue (sheet 08) · all figures from live queries"
      icon="bar-chart-3"
      moduleKey="dashboard"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Reports' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    @if (!canRun) {
      <div class="card muted">Reports are available to HR, managers and tenant admins.</div>
    } @else {
      <div class="grid">
        <div class="card list">
          <h2 style="margin-top:0">Catalogue</h2>
          @for (r of catalogue; track r.code) {
            <button [class.sel]="selected?.code === r.code" (click)="select(r)">
              <strong>{{ r.code }}</strong> — {{ r.name }}
              <span class="badge" [class.warn]="r.priority === 'Should'">{{ r.priority }}</span>
            </button>
          } @empty { <p class="muted">Loading…</p> }
        </div>

        <div class="card">
          @if (selected) {
            <div class="toolbar" style="margin-bottom:.5rem">
              <div>
                <h2 style="margin:0">{{ selected.name }}</h2>
                <p class="muted" style="margin:.25rem 0 0">{{ selected.code }} · {{ selected.audience }}</p>
              </div>
              <button (click)="run()" [disabled]="loading">{{ loading ? 'Running…' : '▶ Run report' }}</button>
            </div>
            <p class="muted" style="font-size:.82rem">{{ selected.filters }}</p>
            <div class="row" style="align-items:flex-end;margin:.75rem 0">
              <div><label>From</label><input type="date" [(ngModel)]="filters.from" /></div>
              <div><label>To</label><input type="date" [(ngModel)]="filters.to" /></div>
            </div>

            @if (result) {
              <p class="muted" style="font-size:.8rem">Generated {{ result.generatedAt | date:'medium' }}</p>
              @if (result.data?.kpis) {
                <div class="kpis">
                  @for (k of result.data.kpis; track k.label) {
                    <div class="kpi"><div class="n">{{ k.value }}</div><div class="l">{{ k.label }}</div></div>
                  }
                </div>
              }
              @if (tableRows.length) {
                <export-bar [rows]="tableRows" [cols]="tableCols" [name]="selected.code" />
                <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true" />
              }
              <details style="margin-top:.75rem">
                <summary class="muted">Raw JSON</summary>
                <pre>{{ result.data | json }}</pre>
              </details>
            }
          } @else {
            <p class="muted">Select a report from the catalogue.</p>
          }
        </div>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  catalogue: ReportDef[] = [];
  selected: ReportDef | null = null;
  result: any = null;
  loading = false;
  error = '';
  filters: { from?: string; to?: string } = {};
  tableRows: Record<string, unknown>[] = [];
  tableCols: { key: string; label: string }[] = [];

  get canRun() {
    return this.auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER');
  }

  async ngOnInit() {
    if (!this.canRun) return;
    try {
      this.catalogue = await this.api.get<ReportDef[]>('/reports');
      if (this.catalogue.length) this.select(this.catalogue[0]);
    } catch (e) { this.error = errMsg(e); }
  }

  select(r: ReportDef) {
    this.selected = r;
    this.result = null;
    this.tableRows = [];
    this.tableCols = [];
  }

  async run() {
    if (!this.selected) return;
    this.loading = true;
    this.error = '';
    try {
      const q = new URLSearchParams();
      if (this.filters.from) q.set('from', this.filters.from);
      if (this.filters.to) q.set('to', this.filters.to);
      const qs = q.toString();
      this.result = await this.api.get<any>(`/reports/${this.selected.code}${qs ? '?' + qs : ''}`);
      this.buildTable(this.result?.data);
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }

  private buildTable(data: any) {
    this.tableRows = [];
    this.tableCols = [];
    if (!data) return;
    const rows =
      data.rows ??
      data.funnel ??
      data.stages ??
      data.sources ??
      data.offersByStatus ??
      data.byStatus ??
      data.byDepartment ??
      data.clearancesByStatus ??
      [];
    if (!Array.isArray(rows) || !rows.length) return;
    this.tableRows = rows;
    this.tableCols = Object.keys(rows[0]).map((k) => ({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    }));
  }
}

import { Component, Input, OnInit, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { MODULE_REPORTS } from '../core/rbac';
import { ExportColumn } from '../core/export.service';
import { ExportBarComponent } from '../core/export-bar.component';
import { IconComponent } from './icon.component';

interface ReportDef {
  code: string;
  name: string;
  priority: string;
}

@Component({
  selector: 'e360-module-reports',
  standalone: true,
  imports: [FormsModule, DatePipe, JsonPipe, RouterLink, IconComponent, ExportBarComponent],
  template: `
    @if (!canRun) {
      <div class="card e360-muted">Reports require HR, Manager, or Tenant Admin role.</div>
    } @else if (!reportCodes.length) {
      <div class="card e360-muted">No module-specific reports configured.</div>
    } @else {
      <div class="row" style="align-items:flex-start">
        <div class="card" style="flex:0 0 260px;max-width:280px">
          <h2 style="margin-top:0;display:flex;align-items:center;gap:.35rem">
            <e360-icon name="file-bar-chart" [size]="18" /> Module reports
          </h2>
          @for (r of filteredCatalogue; track r.code) {
            <button
              class="secondary"
              style="display:block;width:100%;text-align:left;margin:.3rem 0"
              [style.border-color]="selected?.code === r.code ? 'var(--e360-primary)' : ''"
              (click)="select(r)"
            >
              <strong>{{ r.code }}</strong><br />
              <span class="e360-muted" style="font-size:.78rem">{{ r.name }}</span>
            </button>
          }
          <a routerLink="/reports" class="e360-muted" style="font-size:.8rem;display:block;margin-top:.75rem">
            View full catalogue →
          </a>
        </div>
        <div class="card" style="flex:1">
          @if (selected) {
            <div class="e360-toolbar">
              <div>
                <h2 style="margin:0">{{ selected.name }}</h2>
                <p class="e360-muted" style="margin:.2rem 0 0;font-size:.82rem">{{ selected.code }}</p>
              </div>
              <button (click)="run()" [disabled]="loading">{{ loading ? 'Running…' : 'Run report' }}</button>
            </div>
            <div class="e360-form-grid" style="margin:.75rem 0">
              <div><label>From</label><input type="date" [(ngModel)]="filters.from" /></div>
              <div><label>To</label><input type="date" [(ngModel)]="filters.to" /></div>
            </div>
            @if (error) { <div class="e360-error">{{ error }}</div> }
            @if (result) {
              <div class="e360-toolbar" style="margin:.5rem 0">
                <p class="e360-muted" style="font-size:.8rem;margin:0">Generated {{ result.generatedAt | date:'medium' }}</p>
                @if (exportRows.length) {
                  <export-bar [rows]="exportRows" [cols]="exportCols" [name]="exportName" />
                }
              </div>
              @if (result.data?.kpis) {
                <div class="e360-kpis">
                  @for (k of result.data.kpis; track k.label) {
                    <div class="e360-kpi"><div class="n">{{ k.value }}</div><div class="l">{{ k.label }}</div></div>
                  }
                </div>
              }
              <details style="margin-top:.75rem">
                <summary class="e360-muted">Raw data</summary>
                <pre style="background:#f8fafc;padding:.75rem;border-radius:8px;overflow:auto;max-height:280px;font-size:.75rem">{{ result.data | json }}</pre>
              </details>
            }
          } @else {
            <p class="e360-muted">Select a report to run.</p>
          }
        </div>
      </div>
    }
  `,
})
export class ModuleReportsComponent implements OnInit {
  @Input() moduleKey = '';

  private api = inject(ApiService);
  auth = inject(AuthService);

  catalogue: ReportDef[] = [];
  filteredCatalogue: ReportDef[] = [];
  selected: ReportDef | null = null;
  result: any = null;
  loading = false;
  error = '';
  filters: { from?: string; to?: string } = {};

  get reportCodes() { return MODULE_REPORTS[this.moduleKey] ?? []; }
  get canRun() { return this.auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER'); }
  get exportName() { return `${this.moduleKey || 'module'}-${this.selected?.code ?? 'report'}`; }

  get exportRows(): Record<string, unknown>[] {
    const data = this.result?.data;
    if (!data || typeof data !== 'object') return [];
    const rows: Record<string, unknown>[] = [];
    for (const [section, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          rows.push({ section, ...(item as Record<string, unknown>) });
        } else {
          rows.push({ section, value: item });
        }
      }
    }
    if (rows.length) return rows;
    return Object.entries(data)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .map(([metric, value]) => ({ metric, value }));
  }

  get exportCols(): ExportColumn[] {
    const keys: string[] = [];
    for (const row of this.exportRows) {
      for (const key of Object.keys(row)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys.map((key) => ({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (value) => value.toUpperCase()),
    }));
  }

  async ngOnInit() {
    if (!this.canRun || !this.reportCodes.length) return;
    try {
      this.catalogue = await this.api.get<ReportDef[]>('/reports');
      this.filteredCatalogue = this.catalogue.filter((r) => this.reportCodes.includes(r.code));
      if (this.filteredCatalogue.length) this.select(this.filteredCatalogue[0]);
    } catch (e) { this.error = errMsg(e); }
  }

  select(r: ReportDef) {
    this.selected = r;
    this.result = null;
    this.error = '';
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
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
}

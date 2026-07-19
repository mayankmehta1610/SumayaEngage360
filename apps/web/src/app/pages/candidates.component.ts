import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { AuthService } from '../core/auth.service';
import { LifecycleWizardComponent } from '../ui/lifecycle-wizard.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent, DataTableComponent, LifecycleWizardComponent],
  template: `
    <e360-module-shell
      title="Talent pool"
      description="Candidates, resume parsing, and job matching."
      icon="user-search"
      moduleKey="candidates"
      auditEntityType="CANDIDATE"
      rolesHint="TENANT_ADMIN, HR, INTERVIEWER"
      [breadcrumbs]="[{ label: 'Recruitment' }, { label: 'Talent pool' }]"
    >
      <div actions class="e360-toolbar" style="margin:0;gap:.4rem">
        @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
          <button class="secondary" (click)="parseNow()" [disabled]="busy">
            {{ busy ? 'Parsing…' : 'Run offline resume parser now' }}
          </button>
        }
        <export-bar [rows]="candidates" [cols]="exportCols" name="candidates" />
      </div>

      @if (parseInfo) { <div class="card" style="border-color:#22c55e">{{ parseInfo }}</div> }
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Candidates ({{ total }})</h2>
        </div>
        <e360-data-table
          [columns]="tableCols"
          [rows]="tableRows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [searchable]="false"
          [filterable]="true"
          [stickyHeader]="true"
          [rowClickable]="true"
          [selectedId]="detailFor"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onTableFilterChange($event)"
          (rowClick)="onRowClick($event)"
          emptyMessage="No candidates yet — they appear when people apply on the careers pages."
        >
          <div filters>
            <div>
              <label>Search</label>
              <input [(ngModel)]="search" (ngModelChange)="onSearchChange()" placeholder="Name or email…" />
            </div>
          </div>
        </e360-data-table>
      </div>

      @if (detailFor && detail) {
        @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
          <e360-lifecycle-wizard
            entityType="CANDIDATE"
            [entityId]="detail.id"
            workflowCode="CANDIDATE_INTAKE"
            [title]="detail.firstName + ' ' + detail.lastName + ' — candidate readiness'"
            [metadata]="{ email: detail.email, source: 'Talent pool' }"
          />
        }
        <div class="card">
          <h2 style="margin-top:0">{{ detail.firstName }} {{ detail.lastName }} — profile</h2>
          @if (detail.parsedResume) {
            <div class="row">
              <div><label>Parsed by</label><div>{{ detail.parsedResume.method }}</div></div>
              <div><label>Experience</label><div>{{ detail.parsedResume.totalYearsExperience ?? '—' }} years</div></div>
              <div><label>Phone</label><div>{{ detail.parsedResume.phone ?? detail.phone ?? '—' }}</div></div>
            </div>
            @if (detail.parsedResume.summary) { <p class="e360-muted">{{ detail.parsedResume.summary }}</p> }
          }
          <h2>Application history</h2>
          <e360-data-table [columns]="appHistCols" [rows]="appHistRows" [pageSize]="15" [stickyHeader]="true" />
          <h2>Job match scores</h2>
          <e360-data-table [columns]="matchCols" [rows]="matchRows" [pageSize]="15" [stickyHeader]="true" />
          <h2>Global mobility</h2>
          <p class="e360-muted">Country profiles: {{ detail.jurisdictionProfiles?.length ?? 0 }} · Work authorization cases: {{ detail.workAuthorizations?.length ?? 0 }}</p>
          @for (wa of detail.workAuthorizations ?? []; track wa.id) {
            <div class="row"><div><strong>{{ wa.jurisdictionCode }}{{ wa.memberStateCode ? '/' + wa.memberStateCode : '' }}</strong></div><div>{{ wa.authorizationType }}</div><div>{{ wa.status }}</div><div>{{ wa.expiresAt ? (wa.expiresAt | date:'mediumDate') : 'No expiry recorded' }}</div></div>
          }
        </div>
      }
    </e360-module-shell>
  `,
})
export class CandidatesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  candidates: any[] = [];
  detail: any = null;
  detailFor: string | null = null;
  error = '';
  parseInfo = '';
  busy = false;
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  search = '';
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  private searchTimer?: ReturnType<typeof setTimeout>;

  exportCols = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: '_count.applications', label: 'Applications' },
    { key: '_count.matches', label: 'Matches' },
    { key: 'createdAt', label: 'Added' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'skills', label: 'Skills' },
    { key: 'resume', label: 'Resume' },
    { key: 'parsed', label: 'Parsed' },
    { key: 'applications', label: 'Apps', sortable: true },
    { key: 'matches', label: 'Matches', sortable: true },
    { key: 'authorizationCases', label: 'Work auth' },
    { key: 'added', label: 'Added', sortable: true },
  ];
  appHistCols: TableColumn[] = [
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'source', label: 'Source' },
    { key: 'date', label: 'Date' },
  ];
  matchCols: TableColumn[] = [
    { key: 'job', label: 'Job' },
    { key: 'rule', label: 'Rule %' },
    { key: 'ai', label: 'AI %' },
    { key: 'final', label: 'Final %' },
    { key: 'shortlisted', label: 'Shortlisted' },
  ];

  get appHistRows() {
    return (this.detail?.applications ?? []).map((a: any) => ({
      role: a.job.title,
      status: a.status,
      source: a.source ?? '—',
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—',
    }));
  }

  get matchRows() {
    return (this.detail?.matches ?? []).map((m: any) => ({
      job: m.job.title,
      rule: m.ruleScore ?? '—',
      ai: m.aiScore ?? '—',
      final: m.finalScore,
      shortlisted: m.shortlisted ? 'yes' : 'no',
    }));
  }

  get tableRows() {
    return this.candidates.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      skills: (c.skills ?? []).map((s: any) => s.skill?.name).filter(Boolean).join(', ') || '—',
      resume: c.resumeFileId ? 'Yes' : '—',
      parsed: c.parsedResume
        ? (c.parsedResume.method === 'AI' ? 'AI parsed' : 'Parsed')
        : (c.resumeFileId ? 'Pending' : '—'),
      applications: c._count?.applications ?? 0,
      matches: c._count?.matches ?? 0,
      authorizationCases: c._count?.workAuthorizations ?? 0,
      added: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
    }));
  }

  async ngOnInit() { await this.load(); }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
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

  onTableFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async onRowClick(row: Record<string, unknown>) {
    const id = String(row['id'] ?? '');
    if (this.detailFor === id) {
      this.detailFor = null;
      this.detail = null;
      return;
    }
    this.detailFor = id;
    await this.loadDetail(id);
  }

  async load() {
    this.loading = true;
    try {
      const extra: Record<string, string> = {};
      if (this.search.trim()) extra.search = this.search.trim();
      const params = tableListParams(this.page, this.pageSize, extra, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/candidates', params);
      const { items, meta } = unwrapPaginated(res);
      this.candidates = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }

  async loadDetail(id: string) {
    try { this.detail = await this.api.get<any>(`/candidates/${id}`); }
    catch (e) { this.error = errMsg(e); }
  }

  async parseNow() {
    this.busy = true;
    this.parseInfo = '';
    try {
      const r = await this.api.post<any>('/matching/parse-pending');
      this.parseInfo = `Offline parser finished: ${r.parsed} of ${r.pending} pending resume(s) parsed. (Also runs automatically every 15 minutes.)`;
      await this.load();
    } catch (e) { this.error = errMsg(e); }
    finally { this.busy = false; }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent, DataTableComponent],
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
          <div class="e360-table-wrap">
            <table class="e360-table">
              <tr><th>Role</th><th>Status</th><th>Source</th><th>Date</th></tr>
              @for (a of detail.applications; track a.id) {
                <tr>
                  <td>{{ a.job.title }}</td>
                  <td><span class="badge">{{ a.status }}</span></td>
                  <td>{{ a.source ?? '—' }}</td>
                  <td>{{ a.createdAt | date }}</td>
                </tr>
              }
            </table>
          </div>
          <h2>Job match scores</h2>
          <div class="e360-table-wrap">
            <table class="e360-table">
              <tr><th>Job</th><th>Rule %</th><th>AI %</th><th>Final %</th><th>Shortlisted</th></tr>
              @for (m of detail.matches; track m.id) {
                <tr>
                  <td>{{ m.job.title }}</td>
                  <td>{{ m.ruleScore ?? '—' }}</td>
                  <td>{{ m.aiScore ?? '—' }}</td>
                  <td><strong>{{ m.finalScore }}</strong></td>
                  <td>@if (m.shortlisted) { <span class="badge ok">yes</span> } @else { no }</td>
                </tr>
              }
            </table>
          </div>
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
    { key: 'added', label: 'Added', sortable: true },
  ];

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
      const params: Record<string, string> = {
        page: String(this.page),
        pageSize: String(this.pageSize),
      };
      if (this.search.trim()) params.search = this.search.trim();
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

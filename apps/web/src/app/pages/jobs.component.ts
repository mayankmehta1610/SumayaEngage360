import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ExportBarComponent } from '../core/export-bar.component';
import { HasRoleDirective } from '../core/has-role.directive';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { IconComponent } from '../ui/icon.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    ExportBarComponent,
    HasRoleDirective,
    ModuleShellComponent,
    DataTableComponent,
    IconComponent,
    SelectFieldComponent,
  ],
  template: `
    <e360-module-shell
      title="Jobs"
      description="Manage job requisitions, hiring teams, and talent-pool matching."
      icon="file-text"
      moduleKey="jobs"
      auditEntityType="JOB"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Recruitment' }, { label: 'Jobs' }]"
    >
      <div actions class="e360-toolbar" style="margin:0">
        <export-bar [rows]="jobs" [cols]="exportCols" name="jobs" />
      </div>

      <div *hasRole="'TENANT_ADMIN','HR'" class="card">
        <h2>Create job requisition</h2>
        <div class="e360-form-grid">
          <div><label>Title</label><input [(ngModel)]="f.title" placeholder="e.g. Senior Backend Engineer" /></div>
          <e360-select-field
            label="Hiring client"
            placeholder="— Internal —"
            [options]="clientOptions"
            [(ngModel)]="f.hiringClientId"
          />
          <div><label for="job-location">Location</label><input id="job-location" [(ngModel)]="f.location" /></div>
          <div><label>Vacancies</label><input type="number" [(ngModel)]="f.vacancies" min="1" /></div>
          <e360-select-field
            label="Employment type"
            placeholder="choose…"
            [options]="employmentTypeOptions"
            [(ngModel)]="f.employmentType"
          />
          <e360-select-field
            label="Status filter"
            placeholder="All statuses"
            [multiple]="true"
            [options]="statusOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="page = 1; load()"
          />
        </div>
        <label>Job description</label>
        <textarea rows="4" [(ngModel)]="f.description" placeholder="Full JD…"></textarea>
        <div class="row">
          <div><label>Skills (comma separated)</label><input [(ngModel)]="skills" /></div>
          <div><label>Interview rounds (ordered)</label><input [(ngModel)]="rounds" placeholder="Screening, Technical, HR" /></div>
        </div>
        @if (error) { <div class="e360-error">{{ error }}</div> }
        <button (click)="create()"><e360-icon name="plus" [size]="14" /> Create job</button>
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Job catalogue ({{ total }})</h2>
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
          emptyMessage="No jobs found."
        >
          <ng-template #rowTemplate let-row>
            <td>{{ row.title }}</td>
            <td>{{ row.client }}</td>
            <td>{{ row.location }}</td>
            <td>{{ row.vacancies }}</td>
            <td>{{ row.applications }}</td>
            <td><span class="e360-badge" [class.success]="row.status === 'PUBLISHED'">{{ row.status }}</span></td>
            <td style="white-space:nowrap">
              @if (row.status === 'DRAFT') {
                <button class="sm" (click)="publish(row.id)">Publish</button>
              }
              <button class="secondary sm" (click)="toggleMatches(row._raw)">
                {{ matchesFor === row.id ? 'Hide matches' : 'Matches' }}
              </button>
            </td>
          </ng-template>
        </e360-data-table>
      </div>

      @if (matchesFor) {
        <div class="card">
          <div class="e360-toolbar">
            <h2 style="margin:0">Talent-pool matches</h2>
            <span style="display:inline-flex;gap:.4rem">
              <button class="secondary" (click)="runMatch(false)" [disabled]="matching">Rule-based match</button>
              <button class="secondary" (click)="runMatch(true)" [disabled]="matching">AI match</button>
              <export-bar [rows]="matches" [cols]="matchCols" name="job-matches" />
            </span>
          </div>
          @if (matching) { <p class="e360-muted">Scoring candidates…</p> }
          <e360-data-table [columns]="matchTableCols" [rows]="matchRows" [pageSize]="15" />
        </div>
      }
    </e360-module-shell>
  `,
})
export class JobsComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  @Input() status?: string;
  jobs: any[] = [];
  clients: any[] = [];
  employmentTypes: any[] = [];
  error = '';
  statusFilter: string[] = [];
  statusOptions: SelectOption[] = [
    { value: 'CLOSED', label: 'Closed' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ON_HOLD', label: 'On hold' },
    { value: 'PUBLISHED', label: 'Published' },
  ];
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  get totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageFrom() { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageTo() { return Math.min(this.page * this.pageSize, this.total); }

  get tableRows() {
    return this.jobs.map((j) => ({
      id: j.id,
      title: j.title,
      client: j.hiringClient?.name ?? '—',
      location: j.location ?? '—',
      vacancies: j.vacancies,
      applications: j._count?.applications ?? 0,
      status: j.status,
      _raw: j,
    }));
  }
  exportCols = [
    { key: 'title', label: 'Title' },
    { key: 'hiringClient.name', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'vacancies', label: 'Vacancies' },
    { key: '_count.applications', label: 'Applications' },
    { key: 'status', label: 'Status' },
  ];
  tableCols: TableColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'client', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'vacancies', label: 'Vacancies' },
    { key: 'applications', label: 'Applications' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];
  f: any = { vacancies: 1 };
  skills = '';
  rounds = '';
  matchesFor: string | null = null;
  matches: any[] = [];
  matching = false;
  matchCols = [
    { key: 'candidate.firstName', label: 'First name' },
    { key: 'candidate.lastName', label: 'Last name' },
    { key: 'candidate.email', label: 'Email' },
    { key: 'ruleScore', label: 'Rule %' },
    { key: 'aiScore', label: 'AI %' },
    { key: 'finalScore', label: 'Final %' },
    { key: 'shortlisted', label: 'Shortlisted' },
  ];
  matchTableCols: TableColumn[] = [
    { key: 'name', label: 'Candidate', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'ruleScore', label: 'Rule %', sortable: true },
    { key: 'aiScore', label: 'AI %', sortable: true },
    { key: 'finalScore', label: 'Final %', sortable: true },
    { key: 'shortlisted', label: 'Status', sortable: true },
  ];

  get clientOptions(): SelectOption[] {
    return this.clients.map((c) => ({ value: c.id, label: c.name }));
  }

  get employmentTypeOptions(): SelectOption[] {
    return this.employmentTypes.map((et) => ({ value: et.code, label: et.name }));
  }

  get matchRows() {
    return this.matches.map((m) => ({
      name: `${m.candidate.firstName} ${m.candidate.lastName}`,
      email: m.candidate.email,
      ruleScore: m.ruleScore ?? '—',
      aiScore: m.aiScore ?? '—',
      finalScore: m.finalScore,
      shortlisted: m.shortlisted ? 'Shortlisted' : 'Scored',
    }));
  }

  async ngOnInit() {
    this.statusFilter = this.status ? [this.status] : [];
    await this.load();
    try { this.clients = await this.api.get<any[]>('/hiring-clients'); } catch { /* optional */ }
    try {
      this.employmentTypes = await this.api.get<any[]>('/org-masters/employment-types');
      if (this.employmentTypes.length && !this.f.employmentType) {
        this.f.employmentType = this.employmentTypes[0].code;
      }
    } catch { /* optional */ }
  }
  ngOnChanges() {
    this.statusFilter = this.status ? [this.status] : [];
    this.page = 1;
    this.load();
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
      const extra: Record<string, string | string[]> = {};
      if (this.statusFilter.length) extra.status = this.statusFilter;
      else if (this.status) extra.status = [this.status];
      const params = tableListParams(this.page, this.pageSize, extra, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/jobs', params);
      const { items, meta } = unwrapPaginated(res);
      this.jobs = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }
  async create() {
    this.error = '';
    try {
      const body = {
        ...this.f,
        hiringClientId: this.f.hiringClientId || undefined,
        skills: this.skills.split(',').map((s) => s.trim()).filter(Boolean),
        interviewPlan: this.rounds.split(',').map((s) => s.trim()).filter(Boolean)
          .map((name, i) => ({ level: i + 1, name })),
      };
      await this.api.post('/jobs', body);
      this.f = { vacancies: 1, employmentType: this.employmentTypes[0]?.code };
      this.skills = this.rounds = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async publish(id: string) {
    try {
      await this.api.post(`/jobs/${id}/publish`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async toggleMatches(j: any) {
    if (this.matchesFor === j.id) { this.matchesFor = null; return; }
    this.matchesFor = j.id;
    await this.loadMatches();
  }
  async loadMatches() {
    if (!this.matchesFor) return;
    try { this.matches = await this.api.get<any[]>(`/jobs/${this.matchesFor}/matches`); }
    catch (e) { this.error = errMsg(e); }
  }
  async runMatch(useAi: boolean) {
    if (!this.matchesFor) return;
    this.matching = true;
    try {
      await this.api.post(`/jobs/${this.matchesFor}/match`, { useAi });
      await this.loadMatches();
    } catch (e) { this.error = errMsg(e); }
    finally { this.matching = false; }
  }
}

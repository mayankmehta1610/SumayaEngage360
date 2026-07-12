import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';
import { HasRoleDirective } from '../core/has-role.directive';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    ExportBarComponent,
    HasRoleDirective,
    ModuleShellComponent,
    DataTableComponent,
    IconComponent,
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
          <div>
            <label>Hiring client</label>
            <select [(ngModel)]="f.hiringClientId">
              <option [ngValue]="undefined">— Internal —</option>
              @for (c of clients; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div><label for="job-location">Location</label><input id="job-location" [(ngModel)]="f.location" /></div>
          <div><label>Vacancies</label><input type="number" [(ngModel)]="f.vacancies" min="1" /></div>
          <div><label>Employment type</label>
            <select [(ngModel)]="f.employmentType">
              <option [ngValue]="undefined">choose…</option>
              @for (et of employmentTypes; track et.id) { <option [value]="et.code">{{ et.name }}</option> }
            </select>
          </div>
          <div><label>Status filter</label>
            <select [(ngModel)]="statusFilter" (ngModelChange)="load()">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ON_HOLD">On hold</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
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
          <h2 style="margin:0">Job catalogue ({{ jobs.length }})</h2>
        </div>
        <div class="e360-table-wrap">
          <table class="e360-table">
            <tr>
              @for (col of tableCols; track col.key) { <th>{{ col.label }}</th> }
              <th></th>
            </tr>
            @for (j of jobs; track j.id) {
              <tr>
                <td>{{ j.title }}</td>
                <td>{{ j.hiringClient?.name ?? '—' }}</td>
                <td>{{ j.location }}</td>
                <td>{{ j.vacancies }}</td>
                <td>{{ j._count?.applications ?? 0 }}</td>
                <td><span class="e360-badge" [class.success]="j.status === 'PUBLISHED'">{{ j.status }}</span></td>
                <td style="white-space:nowrap">
                  @if (j.status === 'DRAFT') {
                    <button class="sm" (click)="publish(j.id)">Publish</button>
                  }
                  <button class="secondary sm" (click)="toggleMatches(j)">
                    {{ matchesFor === j.id ? 'Hide matches' : 'Matches' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="e360-muted">No jobs found.</td></tr>
            }
          </table>
        </div>
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
          <e360-data-table [columns]="matchTableCols" [rows]="matchRows" [searchable]="true" />
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
  statusFilter = '';
  exportCols = [
    { key: 'title', label: 'Title' },
    { key: 'hiringClient.name', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'vacancies', label: 'Vacancies' },
    { key: '_count.applications', label: 'Applications' },
    { key: 'status', label: 'Status' },
  ];
  tableCols: TableColumn[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'client', label: 'Client', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'vacancies', label: 'Vacancies', sortable: true },
    { key: 'applications', label: 'Applications', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
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

  get tableRows() {
    return this.jobs.map((j) => ({
      ...j,
      client: j.hiringClient?.name ?? '—',
      applications: j._count?.applications ?? 0,
      status: j.status,
      _raw: j,
    }));
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
    this.statusFilter = this.status ?? '';
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
    this.statusFilter = this.status ?? '';
    this.load();
  }
  async load() {
    try {
      const q = this.statusFilter || this.status;
      this.jobs = await this.api.get<any[]>(q ? `/jobs?status=${q}` : '/jobs');
      this.error = '';
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    this.error = '';
    try {
      const body = {
        ...this.f,
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
